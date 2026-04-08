"""
Candor backend FastAPI server.

Supports both local runs from `backend/` and package imports from the
repository root, which is how Railway starts the app.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import AsyncGroq
from pydantic import BaseModel

try:
    from .analysis import analyze_user, check_readiness, merge_traits
    from .candor_ai import MAX_COMPLETION_TOKENS, MODEL, SYSTEM_PROMPT, TEMPERATURE
    from .compatibility import score_compatibility
except ImportError:
    from analysis import analyze_user, check_readiness, merge_traits
    from candor_ai import MAX_COMPLETION_TOKENS, MODEL, SYSTEM_PROMPT, TEMPERATURE
    from compatibility import score_compatibility

logger = logging.getLogger("candor")
FALLBACK_REPLY = "take your time. i'm still here."

load_dotenv(Path(__file__).with_name(".env"))
load_dotenv()

if not os.environ.get("GROQ_API_KEY"):
    raise RuntimeError(
        "GROQ_API_KEY is not set. Copy .env.example to .env and add your Groq API key."
    )

client = AsyncGroq()


@asynccontextmanager
async def lifespan(application: FastAPI):
    print("Candor AI backend is live")
    yield
    print("Shutting down")


app = FastAPI(
    title="Candor AI",
    description="Conversation API for the Candor platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[MessageItem] = []
    stream: bool = False


class ChatResponse(BaseModel):
    reply: str
    history: list[MessageItem]


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    history = [{"role": message.role, "content": message.content} for message in req.history]
    history.append({"role": "user", "content": req.message})
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    try:
        completion = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=TEMPERATURE,
            max_completion_tokens=MAX_COMPLETION_TOKENS,
            stream=False,
        )

        reply = completion.choices[0].message.content or ""
        history.append({"role": "assistant", "content": reply})

        return ChatResponse(
            reply=reply,
            history=[MessageItem(role=item["role"], content=item["content"]) for item in history],
        )
    except Exception as exc:
        logger.error("Groq API error in /chat: %s", exc, exc_info=True)
        history.append({"role": "assistant", "content": FALLBACK_REPLY})
        return ChatResponse(
            reply=FALLBACK_REPLY,
            history=[MessageItem(role=item["role"], content=item["content"]) for item in history],
        )


@app.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    history = [{"role": message.role, "content": message.content} for message in req.history]
    history.append({"role": "user", "content": req.message})
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    async def generate():
        import json

        reply_parts: list[str] = []

        try:
            stream = await client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=TEMPERATURE,
                max_completion_tokens=MAX_COMPLETION_TOKENS,
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    reply_parts.append(delta.content)
                    yield f"data: {json.dumps({'token': delta.content})}\n\n"

            full_reply = "".join(reply_parts)
            history.append({"role": "assistant", "content": full_reply})
            yield f"data: {json.dumps({'done': True, 'reply': full_reply, 'history': history})}\n\n"
        except Exception as exc:
            logger.error("Groq API error in /chat/stream: %s", exc, exc_info=True)
            for word in FALLBACK_REPLY.split(" "):
                yield f"data: {json.dumps({'token': word + ' '})}\n\n"
            history.append({"role": "assistant", "content": FALLBACK_REPLY})
            yield f"data: {json.dumps({'done': True, 'reply': FALLBACK_REPLY, 'history': history})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL}


class AnalysisRequest(BaseModel):
    user_id: str
    history: list[MessageItem]


class AnalysisResponse(BaseModel):
    traits: dict
    match_ready: bool


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_endpoint(req: AnalysisRequest):
    try:
        history = [{"role": message.role, "content": message.content} for message in req.history]
        traits = await analyze_user(history)
        return AnalysisResponse(traits=traits, match_ready=check_readiness(traits))
    except Exception as exc:
        logger.error("Analysis error: %s", exc, exc_info=True)
        return AnalysisResponse(traits={}, match_ready=False)


class MergeRequest(BaseModel):
    user_id: str
    existing_traits: dict = {}
    new_traits: dict = {}


class MergeResponse(BaseModel):
    merged_traits: dict
    match_ready: bool


@app.post("/merge-traits", response_model=MergeResponse)
async def merge_endpoint(req: MergeRequest):
    try:
        merged = merge_traits(req.existing_traits, req.new_traits)
        return MergeResponse(merged_traits=merged, match_ready=check_readiness(merged))
    except Exception as exc:
        logger.error("Merge error: %s", exc, exc_info=True)
        return MergeResponse(merged_traits=req.existing_traits, match_ready=False)


class CompatibilityRequest(BaseModel):
    user_a_traits: dict
    user_b_traits: dict


class CompatibilityResponse(BaseModel):
    score: float
    reason: str


@app.post("/compatibility", response_model=CompatibilityResponse)
async def compatibility_endpoint(req: CompatibilityRequest):
    try:
        return CompatibilityResponse(**score_compatibility(req.user_a_traits, req.user_b_traits))
    except Exception as exc:
        logger.error("Compatibility error: %s", exc, exc_info=True)
        return CompatibilityResponse(score=0.0, reason="something quiet connects you")
