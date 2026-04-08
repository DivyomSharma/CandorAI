"""
Candor Backend — FastAPI server for the Candor AI conversation API.

Exposes a single POST endpoint that the Expo frontend calls on every
message send. Supports both streaming (SSE) and non-streaming responses.

Run:
    uvicorn server:app --reload --port 8000
"""

import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import AsyncGroq

from candor_ai import SYSTEM_PROMPT, MODEL, TEMPERATURE, MAX_COMPLETION_TOKENS
from analysis import analyze_user, merge_traits, check_readiness
from compatibility import score_compatibility

logger = logging.getLogger("candor")

# ── Calm fallback — never show technical errors to the user ──────────
FALLBACK_REPLY = "take your time. i'm still here."

# ── Load env ─────────────────────────────────────────────────────────
load_dotenv()

if not os.environ.get("GROQ_API_KEY"):
    raise RuntimeError(
        "GROQ_API_KEY is not set. "
        "Copy .env.example → .env and add your Groq API key."
    )

# ── Groq client ──────────────────────────────────────────────────────
client = AsyncGroq()


# ── App lifecycle ────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(application: FastAPI):
    print("✦ Candor AI backend is live")
    yield
    print("✦ Shutting down")


app = FastAPI(
    title="Candor AI",
    description="Conversation API for the Candor platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow Expo dev server and any localhost origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ────────────────────────────────────────
class MessageItem(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[MessageItem] = []
    stream: bool = False


class ChatResponse(BaseModel):
    reply: str
    history: list[MessageItem]


# ── Endpoints ────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """
    Non-streaming chat. Returns the full reply and updated history.
    Called from the Expo frontend on every message send.
    """
    # Build conversation history dicts
    history = [{"role": m.role, "content": m.content} for m in req.history]
    history.append({"role": "user", "content": req.message})

    # Full messages payload with system prompt
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

        # Append assistant turn to history
        history.append({"role": "assistant", "content": reply})

        return ChatResponse(
            reply=reply,
            history=[MessageItem(role=m["role"], content=m["content"]) for m in history],
        )

    except Exception as e:
        logger.error("Groq API error in /chat: %s", e, exc_info=True)
        # Never expose technical errors — return Candor's calm fallback
        fallback_reply = FALLBACK_REPLY
        history.append({"role": "assistant", "content": fallback_reply})
        return ChatResponse(
            reply=fallback_reply,
            history=[MessageItem(role=m["role"], content=m["content"]) for m in history],
        )


@app.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """
    Streaming chat via Server-Sent Events (SSE).
    Sends token-by-token, then a final [DONE] event with the full
    reply and updated history.
    """
    history = [{"role": m.role, "content": m.content} for m in req.history]
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
                    # SSE format
                    yield f"data: {json.dumps({'token': delta.content})}\n\n"

            full_reply = "".join(reply_parts)
            history.append({"role": "assistant", "content": full_reply})

            # Final event with the complete response
            yield f"data: {json.dumps({'done': True, 'reply': full_reply, 'history': history})}\n\n"

        except Exception as e:
            logger.error("Groq API error in /chat/stream: %s", e, exc_info=True)
            # Stream the calm fallback instead of an error payload
            fallback = FALLBACK_REPLY
            # Send fallback as tokens so the UI renders it naturally
            for word in fallback.split(" "):
                yield f"data: {json.dumps({'token': word + ' '})}\n\n"
            history.append({"role": "assistant", "content": fallback})
            yield f"data: {json.dumps({'done': True, 'reply': fallback, 'history': history})}\n\n"

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


# ── Intelligence endpoints ───────────────────────────────────────────

class AnalysisRequest(BaseModel):
    user_id: str
    history: list[MessageItem]


class AnalysisResponse(BaseModel):
    traits: dict
    match_ready: bool


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_endpoint(req: AnalysisRequest):
    """
    Analyze conversation to infer user traits.
    Runs silently — never interrupts chat flow.
    """
    try:
        history = [{"role": m.role, "content": m.content} for m in req.history]
        traits = await analyze_user(history)
        ready = check_readiness(traits)
        return AnalysisResponse(traits=traits, match_ready=ready)
    except Exception as e:
        logger.error("Analysis error: %s", e, exc_info=True)
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
    """Merge new analysis into existing trait profile."""
    try:
        merged = merge_traits(req.existing_traits, req.new_traits)
        ready = check_readiness(merged)
        return MergeResponse(merged_traits=merged, match_ready=ready)
    except Exception as e:
        logger.error("Merge error: %s", e, exc_info=True)
        return MergeResponse(merged_traits=req.existing_traits, match_ready=False)


class CompatibilityRequest(BaseModel):
    user_a_traits: dict
    user_b_traits: dict


class CompatibilityResponse(BaseModel):
    score: float
    reason: str


@app.post("/compatibility", response_model=CompatibilityResponse)
async def compatibility_endpoint(req: CompatibilityRequest):
    """Score compatibility between two users."""
    try:
        result = score_compatibility(req.user_a_traits, req.user_b_traits)
        return CompatibilityResponse(**result)
    except Exception as e:
        logger.error("Compatibility error: %s", e, exc_info=True)
        return CompatibilityResponse(score=0.0, reason="something quiet connects you")
