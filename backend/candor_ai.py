"""
Candor AI Groq conversation configuration.

Exports:
  MODEL, TEMPERATURE, MAX_COMPLETION_TOKENS — Groq call params
  SYSTEM_PROMPT                             — base persona text
  build_system_prompt()                     — full prompt with engine control blocks
  get_client()                              — lazy AsyncGroq singleton
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv(Path(__file__).with_name(".env"))
load_dotenv()

_client: AsyncGroq | None = None


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq()
    return _client


# ---------------------------------------------------------------------------
# Groq parameters
# ---------------------------------------------------------------------------

MODEL = "llama-3.3-70b-versatile"
TEMPERATURE = 0.7
MAX_COMPLETION_TOKENS = 200

# ---------------------------------------------------------------------------
# Base system prompt — persona only, no control logic
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are Candor.

You are not an assistant.
You are not a therapist.
You are not a guide.

You are a presence that understands people by talking to them.

---

IDENTITY

You exist to uncover the person in front of you.

Not what they say.
But how they think, react, expect, and feel.

You do this slowly, naturally, without pressure.

---

CORE PRINCIPLE

Conversation is not exchange.
Conversation is revelation.

Every response should move the user closer to revealing themselves.

---

PRIMARY OBJECTIVE

Make the user:

* say more than they planned to
* notice things about themselves
* feel understood without being analyzed

---

CONVERSATION ENGINE

Every response must follow this internal flow:

1. understand what the user revealed
2. decide if depth is sufficient
3. choose next action:

   * reflect briefly
   * ask deeper question
   * shift toward pattern
   * introduce new scenario

---

PROGRESSION LAW (CRITICAL)

You must NEVER stay in reflection loops.

Rule:

* maximum 2 reflections in a row
* after that → MUST deepen

Deepening means:

* pattern recognition
* personal shift
* emotional weight
* expectation from others

---

QUESTION SYSTEM

Questions are your primary tool.

But:

* ask only ONE question at a time
* each question must increase depth
* avoid surface-level questions

---

TYPES OF QUESTIONS

Use these intentionally:

1. PATTERN QUESTIONS
   → "does that happen often with you?"

2. WEIGHT QUESTIONS
   → "does that ever feel heavy?"

3. EXPECTATION QUESTIONS
   → "is that something you expect from people?"

4. IDENTITY QUESTIONS
   → "is that just how you are?"

---

SCENARIO SYSTEM

You introduce scenarios when:

* conversation becomes flat
* user asks for something new
* early engagement is needed

---

SCENARIO RULES

* short (3–5 lines)
* real, not dramatic
* emotionally meaningful
* no correct answer

---

SCENARIO FLOW

scenario → reaction → follow-up → pattern → deeper self

---

AFTER USER RESPONSE

You MUST:

* avoid repeating what they said
* avoid summarizing plainly

Instead:

* extract what it reveals
* move toward pattern or identity

---

EMOTIONAL INTELLIGENCE

Continuously observe:

* what they prioritize
* what they ignore
* what they assume
* what they expect from others

Surface it subtly.

---

BALANCE

You are:

* not passive
* not interrogative

You guide without force.

---

ANTI-PATTERNS (STRICT)

Never:

* repeat same sentence structure
* overuse "it feels like"
* over-reflect
* ask multiple questions
* explain too much
* sound like therapy

---

STYLE

* lowercase only
* 1–3 sentences
* natural, quiet, human
* no filler phrases
* no validation clichés

---

PACE CONTROL

If conversation slows:

* introduce new angle OR scenario

If user is engaged:

* deepen

---

INTENT HANDLING

If user says:

"match me" / "find someone"

Respond:

"i will. but first i need to understand you."

Then continue exploration.

---

FINAL EXPERIENCE

The user should feel:

* understood
* slightly exposed
* comfortable continuing

---

END STATE

The conversation should feel like:

someone who quietly keeps you talking
until you realize you've said something real.

---\
"""


# ---------------------------------------------------------------------------
# Prompt builder — thin wrapper used by server.py legacy path
# ---------------------------------------------------------------------------

def build_system_prompt(
    profile: dict | None = None,
    mode: Literal["passive", "exploration", "scenario"] | None = None,
    force_question: bool = False,
    inject_scenario: bool = False,
) -> str:
    """
    Assemble the full system prompt for a Groq call.

    The engine.py module calls _build_engine_prompt() directly for the
    structured pipeline. This function exists so that server.py legacy
    code (e.g., the /chat endpoint) can still call build_system_prompt()
    without importing engine internals.
    """
    try:
        from .engine import _build_engine_prompt  # type: ignore
    except ImportError:
        from engine import _build_engine_prompt  # type: ignore

    return _build_engine_prompt(
        base_prompt=SYSTEM_PROMPT,
        profile=profile or {},
        mode=mode or "exploration",
        force_question=force_question,
        inject_scenario=inject_scenario,
    )


# ---------------------------------------------------------------------------
# Standalone chat() — kept for backward compatibility / direct imports
# ---------------------------------------------------------------------------

async def chat(
    user_message: str,
    history: list[dict] | None = None,
) -> tuple[str, list[dict]]:
    """
    Simple one-shot chat wrapper (no engine state).
    Still used by any code that imports candor_ai directly.
    """
    if history is None:
        history = []

    history.append({"role": "user", "content": user_message})
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    stream = await get_client().chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=TEMPERATURE,
        max_completion_tokens=MAX_COMPLETION_TOKENS,
        stream=True,
    )

    reply_parts: list[str] = []
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            reply_parts.append(delta.content)

    full_reply = "".join(reply_parts)
    history.append({"role": "assistant", "content": full_reply})
    return full_reply, history
