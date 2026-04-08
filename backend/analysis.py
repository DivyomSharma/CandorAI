"""
Candor Analysis Engine — background user understanding.

Runs silently after every ~10 messages. Never interrupts chat.
Infers traits from tone, not explicit statements.
"""

import json
import logging
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("candor.analysis")

client = AsyncGroq()

MODEL = "llama-3.3-70b-versatile"

# ── Analysis prompt ───────────────────────────────────────────────────

ANALYSIS_PROMPT = """\
You are a silent observer analyzing a conversation.

Your job: infer psychological traits from the user's messages.
Do NOT use explicit statements — infer from tone, phrasing, patterns.

Be conservative. If unsure, use "unknown".
Do NOT hallucinate traits.

Return ONLY valid JSON matching this exact schema:

{
  "emotional_depth": "surface | moderate | deep",
  "emotional_regulation": "stable | reactive | volatile | suppressed",
  "communication_style": "direct | expressive | reserved | indirect",
  "listening_quality": "attentive | selective | dismissive",
  "attachment": "secure | anxious | avoidant | disorganized | unknown",
  "conflict_style": "avoid | confront | reflect | escalate | withdraw | unknown",
  "accountability": "high | moderate | low",
  "consistency": "consistent | inconsistent | unpredictable",
  "empathy_level": "high | moderate | low",
  "boundaries": "healthy | weak | rigid",
  "values": []
}

Rules for "values":
- Infer 2-5 values from conversation (e.g. "honesty", "emotional safety", "independence")
- Only include values clearly demonstrated, not just mentioned
- Keep them lowercase, simple words

Return ONLY the JSON object. No explanation. No markdown.\
"""


async def analyze_user(history: list[dict]) -> dict:
    """
    Analyze a conversation to infer user traits.

    Parameters
    ----------
    history : list[dict]
        Conversation history (role + content dicts).
        Should have at least 8 messages to produce meaningful analysis.

    Returns
    -------
    dict
        Trait analysis matching the schema above.
    """
    # Only analyze user messages for trait inference
    user_messages = [m for m in history if m.get("role") == "user"]

    if len(user_messages) < 4:
        return {}

    # Build context — show full conversation so AI has context
    messages = [
        {"role": "system", "content": ANALYSIS_PROMPT},
        {
            "role": "user",
            "content": "Analyze the following conversation and return the trait JSON:\n\n"
            + "\n".join(
                f"{m['role']}: {m['content']}" for m in history
            ),
        },
    ]

    try:
        completion = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.3,  # low temp for consistent analysis
            max_completion_tokens=400,
            stream=False,
        )

        raw = completion.choices[0].message.content or ""

        # Extract JSON from response (handle markdown wrapping)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            raw = raw.rsplit("```", 1)[0]
        raw = raw.strip()

        traits = json.loads(raw)
        return traits

    except json.JSONDecodeError as e:
        logger.error("Analysis returned invalid JSON: %s", e)
        return {}
    except Exception as e:
        logger.error("Analysis failed: %s", e)
        return {}


# ── Trait merging (incremental learning) ──────────────────────────────

# Fields that require 3+ consistent readings before overwriting
STABLE_FIELDS = {"attachment", "conflict_style", "boundaries"}

# Fields that update more freely
VOLATILE_FIELDS = {
    "emotional_depth",
    "emotional_regulation",
    "communication_style",
    "listening_quality",
    "accountability",
    "consistency",
    "empathy_level",
}


def merge_traits(existing: dict, new_traits: dict) -> dict:
    """
    Merge new analysis into existing trait profile.

    - Stable traits only update after consistent readings
    - Values are union-merged, never subtracted
    - New fields fill in unknowns
    """
    if not new_traits:
        return existing

    merged = {**existing}

    # Track consistency counts
    counts = merged.get("_consistency_counts", {})

    for field in VOLATILE_FIELDS:
        if field in new_traits and new_traits[field]:
            old_val = merged.get(field)
            new_val = new_traits[field]
            if old_val == "unknown" or not old_val:
                merged[field] = new_val
            else:
                # Update freely for volatile fields
                merged[field] = new_val

    for field in STABLE_FIELDS:
        if field in new_traits and new_traits[field] and new_traits[field] != "unknown":
            old_val = merged.get(field)
            new_val = new_traits[field]

            if old_val == "unknown" or not old_val:
                merged[field] = new_val
                counts[field] = 1
            elif old_val == new_val:
                counts[field] = counts.get(field, 1) + 1
            else:
                # Different value — only overwrite after 3 consistent new readings
                count = counts.get(f"{field}_{new_val}", 0) + 1
                counts[f"{field}_{new_val}"] = count
                if count >= 3:
                    merged[field] = new_val
                    counts[field] = count
                    # Reset competing counts
                    for k in list(counts.keys()):
                        if k.startswith(f"{field}_"):
                            del counts[k]

    # Values — union merge
    existing_values = set(merged.get("values", []))
    new_values = set(new_traits.get("values", []))
    merged["values"] = sorted(existing_values | new_values)

    merged["_consistency_counts"] = counts

    return merged


# ── Readiness check ───────────────────────────────────────────────────

def check_readiness(traits: dict) -> bool:
    """
    Check if enough understanding exists for matching.

    Requires:
    - At least 6 non-unknown trait fields filled
    - At least 2 values identified
    """
    if not traits:
        return False

    all_fields = list(VOLATILE_FIELDS | STABLE_FIELDS)
    filled = sum(
        1
        for f in all_fields
        if traits.get(f) and traits[f] != "unknown"
    )

    values_count = len(traits.get("values", []))

    return filled >= 6 and values_count >= 2
