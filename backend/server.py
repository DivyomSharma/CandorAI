"""
Candor backend FastAPI server.

Supports both local runs from `backend/` and package imports from the
repository root, which is how Railway starts the app.
"""

import json
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
    from .engine import ConversationState, run_turn, run_turn_stream
except ImportError:
    from analysis import analyze_user, check_readiness, merge_traits
    from candor_ai import MAX_COMPLETION_TOKENS, MODEL, SYSTEM_PROMPT, TEMPERATURE
    from compatibility import score_compatibility
    from engine import ConversationState, run_turn, run_turn_stream

logger = logging.getLogger("candor")
FALLBACK_REPLY = "take your time. i'm still here."

load_dotenv(Path(__file__).with_name(".env"))
load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

if not GROQ_API_KEY:
    logger.warning(
        "GROQ_API_KEY is not set. Candor will stay online, but AI replies will fall back."
    )

# ---------------------------------------------------------------------------
# In-memory session state store  {session_id → ConversationState}
# ---------------------------------------------------------------------------
# Keyed by user_id (from auth) or a client-supplied session UUID.
# Survives for the lifetime of the server process.
# Profile is persisted to Supabase every ~3 turns; this is just the hot cache.
_session_states: dict[str, ConversationState] = {}


def get_or_create_state(session_id: str | None) -> tuple[str, ConversationState]:
    """Return (canonical_session_id, state), creating a fresh state if needed."""
    sid = session_id or "anonymous"
    if sid not in _session_states:
        _session_states[sid] = ConversationState()
    return sid, _session_states[sid]


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(application: FastAPI):
    print("Candor AI backend is live")
    yield
    print("Shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Candor AI",
    description="Conversation API for the Candor platform",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class MessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[MessageItem] = []
    # Optional: pass user_id from auth so profile is keyed correctly + persisted
    user_id: str | None = None
    # Legacy / override fields (still accepted for backward compat)
    profile: dict | None = None
    mode: str | None = None
    stream: bool = False


class ChatResponse(BaseModel):
    reply: str
    history: list[MessageItem]
    # Engine diagnostics surfaced to the client (useful for debugging / frontend)
    state_snapshot: dict | None = None


# ---------------------------------------------------------------------------
# /chat  — non-streaming
# ---------------------------------------------------------------------------


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    sid, state = get_or_create_state(req.user_id)

    # Seed profile from explicit profile override if provided (first call)
    if req.profile and not state.user_profile:
        state.user_profile = dict(req.profile)

    history = [{"role": m.role, "content": m.content} for m in req.history]

    if client is None:
        history.append({"role": "user", "content": req.message})
        history.append({"role": "assistant", "content": FALLBACK_REPLY})
        return ChatResponse(
            reply=FALLBACK_REPLY,
            history=[MessageItem(role=i["role"], content=i["content"]) for i in history],
        )

    try:
        reply, history, state = await run_turn(
            user_message=req.message,
            history=history,
            state=state,
            groq_client=client,
            model=MODEL,
            temperature=TEMPERATURE,
            max_tokens=MAX_COMPLETION_TOKENS,
            base_system_prompt=SYSTEM_PROMPT,
            user_id=req.user_id,
        )

        _session_states[sid] = state

        return ChatResponse(
            reply=reply,
            history=[MessageItem(role=i["role"], content=i["content"]) for i in history],
            state_snapshot={
                "turn_count": state.turn_count,
                "consecutive_low_depth": state.consecutive_low_depth,
                "last_response_type": state.response_types[-1] if state.response_types else None,
                "user_profile": {k: v for k, v in state.user_profile.items() if not k.startswith("_")},
            },
        )

    except Exception as exc:
        logger.error("Engine error in /chat: %s", exc, exc_info=True)
        history.append({"role": "assistant", "content": FALLBACK_REPLY})
        return ChatResponse(
            reply=FALLBACK_REPLY,
            history=[MessageItem(role=i["role"], content=i["content"]) for i in history],
        )


# ---------------------------------------------------------------------------
# /chat/stream  — Server-Sent Events
# ---------------------------------------------------------------------------


@app.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    sid, state = get_or_create_state(req.user_id)

    if req.profile and not state.user_profile:
        state.user_profile = dict(req.profile)

    history = [{"role": m.role, "content": m.content} for m in req.history]

    async def generate():
        if client is None:
            for word in FALLBACK_REPLY.split(" "):
                yield f"data: {json.dumps({'token': word + ' '})}\n\n"
            yield f"data: {json.dumps({'done': True, 'reply': FALLBACK_REPLY})}\n\n"
            return

        try:
            # run_turn_stream is an async generator that yields:
            #   str tokens  →  we wrap as SSE token events
            #   dict sentinel {"done": True, ...}  → we wrap as SSE done event
            gen = run_turn_stream(
                user_message=req.message,
                history=history,
                state=state,
                groq_client=client,
                model=MODEL,
                temperature=TEMPERATURE,
                max_tokens=MAX_COMPLETION_TOKENS,
                base_system_prompt=SYSTEM_PROMPT,
                user_id=req.user_id,
            )

            async for item in gen:
                if isinstance(item, str):
                    yield f"data: {json.dumps({'token': item})}\n\n"
                elif isinstance(item, dict) and item.get("done"):
                    _session_states[sid] = state  # state was mutated in-place
                    yield f"data: {json.dumps(item)}\n\n"

        except Exception as exc:
            logger.error("Engine error in /chat/stream: %s", exc, exc_info=True)
            for word in FALLBACK_REPLY.split(" "):
                yield f"data: {json.dumps({'token': word + ' '})}\n\n"
            yield f"data: {json.dumps({'done': True, 'reply': FALLBACK_REPLY})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# /session/reset  — wipe state for a given session (useful on logout)
# ---------------------------------------------------------------------------


class ResetRequest(BaseModel):
    user_id: str | None = None


@app.post("/session/reset")
async def reset_session(req: ResetRequest):
    sid = req.user_id or "anonymous"
    _session_states.pop(sid, None)
    return {"reset": True, "session_id": sid}


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {
        "groq_configured": bool(GROQ_API_KEY),
        "model": MODEL,
        "status": "ok",
        "active_sessions": len(_session_states),
    }


# ---------------------------------------------------------------------------
# /analyze  — deep trait analysis (manual trigger from frontend)
# ---------------------------------------------------------------------------


class AnalysisRequest(BaseModel):
    user_id: str
    history: list[MessageItem]


class AnalysisResponse(BaseModel):
    traits: dict
    match_ready: bool


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_endpoint(req: AnalysisRequest):
    try:
        history = [{"role": m.role, "content": m.content} for m in req.history]
        traits = await analyze_user(history)

        # Also merge into session state if present
        sid = req.user_id
        if sid in _session_states and traits:
            _session_states[sid].user_profile = merge_traits(
                _session_states[sid].user_profile, traits
            )

        return AnalysisResponse(traits=traits, match_ready=check_readiness(traits))
    except Exception as exc:
        logger.error("Analysis error: %s", exc, exc_info=True)
        return AnalysisResponse(traits={}, match_ready=False)


# ---------------------------------------------------------------------------
# /merge-traits
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# /compatibility
# ---------------------------------------------------------------------------


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
