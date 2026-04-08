"""
Candor Conversational Engine.

Owns the full per-turn pipeline:
  detect_depth → choose_mode → enforce_progression → build_prompt
  → generate → clean_output → classify_response → extract_traits
  → persist profile (every 3 turns) + deep analysis (every 5 turns)
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))
load_dotenv()

logger = logging.getLogger("candor.engine")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PERSIST_EVERY_N_TURNS = 3   # flush user_profile to Supabase
ANALYZE_EVERY_N_TURNS = 5   # trigger deep Groq analysis

# Keywords that signal emotional depth
_HIGH_DEPTH_KEYWORDS = {
    "feel", "feeling", "felt", "hurt", "scared", "afraid", "alone",
    "miss", "angry", "anger", "love", "loved", "anxious", "anxiety",
    "wish", "always", "never", "everyone", "nobody", "hate", "cry",
    "cried", "broken", "lost", "empty", "numb", "tired", "exhausted",
    "care", "trust", "betray", "betrayed", "disappoint", "disappear",
    "dread", "heavy", "weight", "heart", "guilt", "shame", "regret",
    "hopeless", "stuck", "invisible",
}

# Filler phrases to strip from AI output (exact lowercase strings, word-boundary matched)
_FILLER_PHRASES = [
    "that's interesting",
    "that is interesting",
    "i really understand",
    "i understand",
    "great question",
    "of course",
    "absolutely",
    "certainly",
    "i can see that",
    "that makes a lot of sense",
    "that makes sense",
    "thank you for sharing",
    "i appreciate you sharing",
    "i appreciate that",
    "i hear you",
    "i see",
]
_FILLER_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(p) for p in _FILLER_PHRASES) + r")\b[.,!]?\s*",
    re.IGNORECASE,
)

# Short generic replies that indicate the model failed to produce anything useful
_GENERIC_REPLIES = {
    "i see.", "okay.", "i understand.", "tell me more.", "go on.",
    "interesting.", "really?", "hmm.", "i see what you mean.",
}

# Scenario trigger phrases from the user
_SCENARIO_TRIGGER_PHRASES = [
    "try something else", "something new", "switch it up", "switch",
    "different topic", "new topic", "change", "another question", "mix it up",
]


# ---------------------------------------------------------------------------
# Step 1 — Conversation State
# ---------------------------------------------------------------------------

@dataclass
class ConversationState:
    """Mutable state that persists across turns in a single session."""

    # Rolling log of last response types (oldest first)
    response_types: list[str] = field(default_factory=list)

    # How many consecutive turns the user depth was "low"
    consecutive_low_depth: int = 0

    # Merged user profile (lightweight traits, updated each turn)
    user_profile: dict = field(default_factory=dict)

    # Total turns processed so far
    turn_count: int = 0

    # Turns since last Supabase flush
    turns_since_persist: int = 0

    # Turns since last deep analysis
    turns_since_analysis: int = 0

    # IDs of scenarios already shown to this user (to avoid repeats)
    seen_scenarios: list[str] = field(default_factory=list)

    def record_response_type(self, rtype: str) -> None:
        self.response_types.append(rtype)
        # Keep only the last 10 to bound memory
        if len(self.response_types) > 10:
            self.response_types = self.response_types[-10:]

    def mark_scenario_seen(self, scenario_id: str) -> None:
        if scenario_id not in self.seen_scenarios:
            self.seen_scenarios.append(scenario_id)


# ---------------------------------------------------------------------------
# Step 2 — Depth Detection
# ---------------------------------------------------------------------------

def detect_depth(user_message: str) -> Literal["low", "medium", "high"]:
    """
    Classify the emotional/personal depth of a user message.

    Rules (in priority order):
    1. Very short messages → low
    2. Contains high-depth emotional keywords → high
    3. Everything else → medium
    """
    text = user_message.strip().lower()
    words = text.split()

    if len(words) <= 5:
        return "low"

    word_set = set(re.sub(r"[^a-z\s]", "", text).split())
    if word_set & _HIGH_DEPTH_KEYWORDS:
        return "high"

    return "medium"


# ---------------------------------------------------------------------------
# Step 3 — Mode Selection
# ---------------------------------------------------------------------------

def choose_mode(depth: Literal["low", "medium", "high"]) -> Literal["passive", "exploration", "scenario"]:
    """
    Map depth to conversation mode.

    low    → scenario  (re-engage with vivid real-life prompt)
    medium → exploration
    high   → exploration (deepen what they've opened up)
    """
    if depth == "low":
        return "scenario"
    return "exploration"


# ---------------------------------------------------------------------------
# Step 4 — Progression Enforcement
# ---------------------------------------------------------------------------

def should_force_question(state: ConversationState) -> bool:
    """
    Returns True if the last two assistant responses were both 'reflection',
    meaning we must deepen now.
    """
    if len(state.response_types) < 2:
        return False
    return state.response_types[-1] == "reflection" and state.response_types[-2] == "reflection"


def should_inject_scenario(state: ConversationState, user_message: str) -> bool:
    """
    Returns True if the user explicitly asks for something new,
    or if depth has been low for 3+ consecutive turns.
    """
    text = user_message.lower()
    if any(phrase in text for phrase in _SCENARIO_TRIGGER_PHRASES):
        return True
    return state.consecutive_low_depth >= 3


# ---------------------------------------------------------------------------
# Step 5 — Response Type Classification
# ---------------------------------------------------------------------------

_SCENARIO_MARKERS = re.compile(
    r"\b(imagine|picture this|say you|let'?s say|suppose|what if)\b",
    re.IGNORECASE,
)


def classify_response_type(reply: str) -> Literal["reflection", "question", "scenario"]:
    """
    Classify an assistant reply as:
    - "question"   → ends with a '?' (after stripping whitespace)
    - "scenario"   → contains scenario-intro language
    - "reflection" → anything else
    """
    stripped = reply.strip()
    if stripped.endswith("?"):
        return "question"
    if _SCENARIO_MARKERS.search(stripped):
        return "scenario"
    return "reflection"


# ---------------------------------------------------------------------------
# Step 6 — Lightweight Trait Extraction (no extra API call)
# ---------------------------------------------------------------------------

def extract_traits_lightweight(user_message: str) -> dict:
    """
    Fast keyword/heuristic trait extraction from a single message.
    This supplements (not replaces) the deep analysis from analysis.py.
    """
    text = user_message.strip().lower()
    words = set(re.sub(r"[^a-z\s]", "", text).split())
    traits: dict = {}

    # Emotional style
    strong_emotions = {
        "angry", "anger", "furious", "rage", "hate",
        "scared", "afraid", "anxious", "anxiety", "fear",
        "hurt", "broken", "empty", "numb", "hopeless",
    }
    soft_emotions = {
        "wish", "hope", "miss", "love", "care", "warm",
        "grateful", "happy", "joy", "peace",
    }
    if words & strong_emotions:
        traits["emotional_style"] = "intense"
    elif words & soft_emotions:
        traits["emotional_style"] = "gentle"

    # Conflict style (blame language → externalising)
    blame_words = {"they", "them", "everyone", "nobody", "people", "always", "never"}
    if len(words & blame_words) >= 2:
        traits["conflict_style"] = "externalising"

    # Communication style (lots of questions in user message)
    if user_message.count("?") >= 2:
        traits["communication_style"] = "indirect"

    # Expectation signals
    expectation_words = {"should", "supposed", "expected", "meant", "deserve"}
    if words & expectation_words:
        traits["expectations"] = "high"

    return traits


def merge_lightweight_traits(existing: dict, new_traits: dict) -> dict:
    """Merge new lightweight traits into existing profile without overwriting stable fields."""
    merged = {**existing}
    for key, value in new_traits.items():
        # Only overwrite if field missing or previously unknown
        if not merged.get(key) or merged.get(key) == "unknown":
            merged[key] = value
    return merged


# ---------------------------------------------------------------------------
# Step 7 — Output Cleanup
# ---------------------------------------------------------------------------

def clean_output(text: str) -> str:
    """
    Post-process raw model output:
    1. Lowercase
    2. Remove filler phrases
    3. Trim to max 3 sentences
    4. Remove repeated short phrases
    5. Strip surrounding whitespace
    """
    text = text.lower().strip()

    # Remove filler
    text = _FILLER_RE.sub(" ", text).strip()

    # Split into sentences (split on .  ?  ! but keep delimiter)
    sentences = re.split(r"(?<=[.?!])\s+", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    # Deduplicate near-identical consecutive sentences
    deduped: list[str] = []
    for sentence in sentences:
        if not deduped or _normalise(sentence) != _normalise(deduped[-1]):
            deduped.append(sentence)

    # Trim to 3 sentences
    trimmed = " ".join(deduped[:3])

    return trimmed.strip()


def _normalise(s: str) -> str:
    """Strip punctuation and collapse spaces for fuzzy comparison."""
    return re.sub(r"[^a-z\s]", "", s.lower()).strip()


def _is_generic(reply: str) -> bool:
    """Return True if the reply is too short or matches known-generic stubs."""
    stripped = reply.strip().lower()
    if len(stripped.split()) <= 5:
        return True
    return stripped in _GENERIC_REPLIES


# ---------------------------------------------------------------------------
# Step 8 — Supabase Profile Persistence
# ---------------------------------------------------------------------------

def _get_supabase_client():
    """Lazy import and build of Supabase client to avoid hard import failures."""
    from supabase import create_client  # type: ignore

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        logger.warning("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — profile will not persist.")
        return None
    return create_client(url, key)


async def persist_profile(user_id: str, profile: dict, match_ready: bool = False) -> None:
    """
    Upsert the user's trait profile into public.profiles.traits (JSONB).
    Uses the service role key so it bypasses RLS safely from the backend.
    """
    if not user_id:
        return

    try:
        client = _get_supabase_client()
        if client is None:
            return

        (
            client.table("profiles")
            .upsert(
                {
                    "id": user_id,
                    "traits": profile,
                    "match_ready": match_ready,
                    "updated_at": "now()",
                },
                on_conflict="id",
            )
            .execute()
        )
        logger.debug("Persisted profile for user %s", user_id)
    except Exception as exc:
        logger.error("Failed to persist profile for %s: %s", user_id, exc)


# ---------------------------------------------------------------------------
# Step 9 — System Prompt Assembly (delegates to candor_ai)
# ---------------------------------------------------------------------------

def _build_engine_prompt(
    base_prompt: str,
    profile: dict,
    mode: Literal["passive", "exploration", "scenario"],
    force_question: bool,
    inject_scenario: bool,
    scenario_text: str | None = None,
) -> str:
    """
    Append structured control blocks to the base system prompt.
    These give the model explicit, machine-generated instructions
    separate from the human-authored persona text.

    scenario_text — if provided, the verbatim scenario body is injected
    instead of a generic instruction, giving the model the exact words
    to work from / follow-up on.
    """
    blocks: list[str] = [base_prompt]

    # User profile injection
    if profile:
        profile_lines = "\n".join(
            f"  {k}: {v}" for k, v in profile.items() if not k.startswith("_")
        )
        blocks.append(f"\n[USER PROFILE — inferred so far]\n{profile_lines}")

    # Mode block
    mode_instructions = {
        "exploration": (
            "[MODE: exploration]\n"
            "The user has opened something. Go deeper.\n"
            "Surface a pattern. Touch on expectation or identity.\n"
            "Do not stay on the surface."
        ),
        "scenario": (
            "[MODE: scenario]\n"
            "The user is being minimal. Re-engage them.\n"
            "Introduce a short, real-life scenario (3-5 lines).\n"
            "Make it emotionally meaningful with no right answer.\n"
            "Then ask one question to pull their reaction."
        ),
        "passive": (
            "[MODE: passive]\n"
            "The user is quiet. Offer something gentle to re-invite them.\n"
            "Do not pressure. No question required."
        ),
    }
    blocks.append("\n" + mode_instructions.get(mode, ""))

    # Progression override
    if force_question:
        blocks.append(
            "\n[FORCE QUESTION]\n"
            "Your last two responses were reflections. You MUST include a deeper question now.\n"
            "Use a pattern, weight, expectation, or identity question.\n"
            "Only one question. Make it count."
        )

    if inject_scenario:
        if scenario_text:
            # Verbatim personalised scenario — model follows up on this exact text
            blocks.append(
                "\n[INJECT SCENARIO — personalised]\n"
                "The following scenario was selected for this user based on their profile.\n"
                "Use it as the basis for your next response. You may quote it, reference it, \n"
                "or riff on it — but stay inside its emotional territory.\n"
                "Do not introduce a different scenario.\n\n"
                f"{scenario_text}"
            )
        else:
            blocks.append(
                "\n[INJECT SCENARIO]\n"
                "Override current flow. Introduce a completely new scenario immediately.\n"
                "Keep it short, concrete, and emotionally charged.\n"
                "No preamble. Just the scenario."
            )

    # Hard output rules (reiterated as machine instruction, not persona)
    blocks.append(
        "\n[OUTPUT RULES — non-negotiable]\n"
        "- lowercase only\n"
        "- 1 to 3 sentences maximum\n"
        "- exactly one question at most (can be zero)\n"
        "- no filler, no therapy-speak, no validation clichés\n"
        "- do not repeat what the user just said"
    )

    return "\n".join(blocks)


# ---------------------------------------------------------------------------
# Main Engine Entry Point
# ---------------------------------------------------------------------------

async def run_turn(
    user_message: str,
    history: list[dict],
    state: ConversationState,
    groq_client,
    model: str,
    temperature: float,
    max_tokens: int,
    base_system_prompt: str,
    user_id: str | None = None,
) -> tuple[str, list[dict], ConversationState]:
    """
    Full pipeline for one conversation turn.

    Returns:
        (cleaned_reply, updated_history, updated_state)
    """
    # -- Step A: Depth detection & state update ----------------------------
    depth = detect_depth(user_message)
    logger.info("turn=%d depth=%s", state.turn_count + 1, depth)

    if depth == "low":
        state.consecutive_low_depth += 1
    else:
        state.consecutive_low_depth = 0

    # -- Step B: Mode & progression ----------------------------------------
    mode = choose_mode(depth)
    force_question = should_force_question(state)
    inject_scenario = should_inject_scenario(state, user_message)

    logger.info("mode=%s force_question=%s inject_scenario=%s", mode, force_question, inject_scenario)

    # -- Step B2: Select personalised scenario if needed -------------------
    scenario_text: str | None = None
    if inject_scenario or mode == "scenario":
        try:
            try:
                from .scenarios import select_scenario
            except ImportError:
                from scenarios import select_scenario
            picked = select_scenario(state.user_profile, state.seen_scenarios)
            scenario_text = f"{picked['label']}\n\n{picked['text']}\n\n{picked['question']}"
            state.mark_scenario_seen(picked["id"])
            logger.info("scenario selected: %s", picked["id"])
        except Exception as exc:
            logger.warning("Scenario selection failed (non-fatal): %s", exc)

    # -- Step C: Build prompt ----------------------------------------------
    system_prompt = _build_engine_prompt(
        base_prompt=base_system_prompt,
        profile=state.user_profile,
        mode=mode,
        force_question=force_question,
        inject_scenario=inject_scenario,
        scenario_text=scenario_text,
    )

    # -- Step D: Add user message to history & build messages list ---------
    history.append({"role": "user", "content": user_message})
    messages = [{"role": "system", "content": system_prompt}] + history

    # -- Step E: Generate reply (with one retry on generic output) ---------
    reply = await _generate(groq_client, model, temperature, max_tokens, messages)

    cleaned = clean_output(reply)

    # Fallback retry if the output is too generic
    if _is_generic(cleaned):
        logger.warning("Generic reply detected — retrying with boosted temperature and forced depth.")
        retry_prompt = system_prompt + (
            "\n\n[RETRY — previous response was too generic]\n"
            "You MUST produce a deeper, more specific response.\n"
            "If you haven't asked a question yet, ask one now. Make it personal."
        )
        retry_messages = [{"role": "system", "content": retry_prompt}] + history
        retry_reply = await _generate(
            groq_client, model, min(temperature + 0.15, 1.0), max_tokens, retry_messages
        )
        cleaned = clean_output(retry_reply)

    # -- Step F: Update state ----------------------------------------------
    rtype = classify_response_type(cleaned)
    state.record_response_type(rtype)
    state.turn_count += 1
    state.turns_since_persist += 1
    state.turns_since_analysis += 1

    logger.info("response_type=%s turn_count=%d", rtype, state.turn_count)

    # -- Step G: Lightweight trait extraction & merge ----------------------
    new_traits = extract_traits_lightweight(user_message)
    state.user_profile = merge_lightweight_traits(state.user_profile, new_traits)

    # -- Step H: Deep analysis every ANALYZE_EVERY_N_TURNS turns -----------
    if state.turns_since_analysis >= ANALYZE_EVERY_N_TURNS:
        state.turns_since_analysis = 0
        try:
            # Avoid circular import — analysis.py and engine.py are siblings
            try:
                from .analysis import analyze_user, merge_traits, check_readiness
            except ImportError:
                from analysis import analyze_user, merge_traits, check_readiness

            deep_traits = await analyze_user(history)
            if deep_traits:
                state.user_profile = merge_traits(state.user_profile, deep_traits)
                logger.info("Deep analysis merged: %s", list(deep_traits.keys()))
        except Exception as exc:
            logger.error("Deep analysis failed (non-fatal): %s", exc)

    # -- Step I: Persist profile to Supabase every PERSIST_EVERY_N_TURNS --
    if state.turns_since_persist >= PERSIST_EVERY_N_TURNS and user_id:
        state.turns_since_persist = 0
        try:
            from .analysis import check_readiness  # type: ignore
        except ImportError:
            from analysis import check_readiness  # type: ignore

        ready = check_readiness(state.user_profile)
        await persist_profile(user_id, state.user_profile, match_ready=ready)

    # -- Step J: Append assistant reply to history -------------------------
    history.append({"role": "assistant", "content": cleaned})

    return cleaned, history, state


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------

async def _generate(groq_client, model: str, temperature: float, max_tokens: int, messages: list[dict]) -> str:
    """Call Groq and return the raw string reply."""
    completion = await groq_client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        stream=False,
    )
    return (completion.choices[0].message.content or "").strip()


async def _generate_stream(groq_client, model: str, temperature: float, max_tokens: int, messages: list[dict]):
    """Async generator yielding raw delta strings from Groq streaming."""
    stream = await groq_client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


async def run_turn_stream(
    user_message: str,
    history: list[dict],
    state: ConversationState,
    groq_client,
    model: str,
    temperature: float,
    max_tokens: int,
    base_system_prompt: str,
    user_id: str | None = None,
):
    """
    Streaming variant of run_turn.

    Yields raw token strings as they arrive,
    then a final dict sentinel: {"done": True, "reply": full_reply, "state": state_snapshot}

    State update (trait extraction, persist, deep analysis) happens after all tokens
    are collected, identical to run_turn.
    """
    depth = detect_depth(user_message)
    if depth == "low":
        state.consecutive_low_depth += 1
    else:
        state.consecutive_low_depth = 0

    mode = choose_mode(depth)
    force_question = should_force_question(state)
    inject_scenario = should_inject_scenario(state, user_message)

    scenario_text: str | None = None
    if inject_scenario or mode == "scenario":
        try:
            try:
                from .scenarios import select_scenario
            except ImportError:
                from scenarios import select_scenario
            picked = select_scenario(state.user_profile, state.seen_scenarios)
            scenario_text = f"{picked['label']}\n\n{picked['text']}\n\n{picked['question']}"
            state.mark_scenario_seen(picked["id"])
        except Exception as exc:
            logger.warning("Scenario selection failed (stream, non-fatal): %s", exc)

    system_prompt = _build_engine_prompt(
        base_prompt=base_system_prompt,
        profile=state.user_profile,
        mode=mode,
        force_question=force_question,
        inject_scenario=inject_scenario,
        scenario_text=scenario_text,
    )

    history.append({"role": "user", "content": user_message})
    messages = [{"role": "system", "content": system_prompt}] + history

    parts: list[str] = []
    async for token in _generate_stream(groq_client, model, temperature, max_tokens, messages):
        parts.append(token)
        yield token  # stream to caller

    full_reply = clean_output("".join(parts))

    # Post-stream state update (mirrors run_turn Steps F–I)
    rtype = classify_response_type(full_reply)
    state.record_response_type(rtype)
    state.turn_count += 1
    state.turns_since_persist += 1
    state.turns_since_analysis += 1

    new_traits = extract_traits_lightweight(user_message)
    state.user_profile = merge_lightweight_traits(state.user_profile, new_traits)

    if state.turns_since_analysis >= ANALYZE_EVERY_N_TURNS:
        state.turns_since_analysis = 0
        try:
            try:
                from .analysis import analyze_user, merge_traits
            except ImportError:
                from analysis import analyze_user, merge_traits
            deep_traits = await analyze_user(history)
            if deep_traits:
                state.user_profile = merge_traits(state.user_profile, deep_traits)
        except Exception as exc:
            logger.error("Deep analysis failed (stream, non-fatal): %s", exc)

    if state.turns_since_persist >= PERSIST_EVERY_N_TURNS and user_id:
        state.turns_since_persist = 0
        try:
            try:
                from .analysis import check_readiness
            except ImportError:
                from analysis import check_readiness
            ready = check_readiness(state.user_profile)
            await persist_profile(user_id, state.user_profile, match_ready=ready)
        except Exception as exc:
            logger.error("Profile persist failed (stream, non-fatal): %s", exc)

    history.append({"role": "assistant", "content": full_reply})

    # Final sentinel with state snapshot
    yield {
        "done": True,
        "reply": full_reply,
        "history": history,
        "state_snapshot": {
            "depth": depth,
            "mode": mode,
            "turn_count": state.turn_count,
            "force_question": force_question,
            "inject_scenario": inject_scenario,
        },
    }
