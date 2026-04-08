"""
Candor analysis engine for background user understanding.
"""

import json
import logging
from pathlib import Path

from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv(Path(__file__).with_name(".env"))
load_dotenv()

logger = logging.getLogger("candor.analysis")

MODEL = "llama-3.3-70b-versatile"
_client: AsyncGroq | None = None


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq()
    return _client


ANALYSIS_PROMPT = """\
You are a silent observer analyzing a conversation.

Your job: infer psychological traits from the user's messages.
Do NOT use explicit statements - infer from tone, phrasing, patterns.

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
    user_messages = [message for message in history if message.get("role") == "user"]
    if len(user_messages) < 4:
        return {}

    messages = [
      {"role": "system", "content": ANALYSIS_PROMPT},
      {
          "role": "user",
          "content": "Analyze the following conversation and return the trait JSON:\n\n"
          + "\n".join(f"{message['role']}: {message['content']}" for message in history),
      },
    ]

    try:
        completion = await get_client().chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.3,
            max_completion_tokens=400,
            stream=False,
        )

        raw = (completion.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            raw = raw.rsplit("```", 1)[0]
        return json.loads(raw.strip())
    except json.JSONDecodeError as exc:
        logger.error("Analysis returned invalid JSON: %s", exc)
        return {}
    except Exception as exc:
        logger.error("Analysis failed: %s", exc)
        return {}


STABLE_FIELDS = {"attachment", "conflict_style", "boundaries"}
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
    if not new_traits:
        return existing

    merged = {**existing}
    counts = merged.get("_consistency_counts", {})

    for field in VOLATILE_FIELDS:
        if field in new_traits and new_traits[field]:
            old_val = merged.get(field)
            new_val = new_traits[field]
            if old_val == "unknown" or not old_val:
                merged[field] = new_val
            else:
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
                count = counts.get(f"{field}_{new_val}", 0) + 1
                counts[f"{field}_{new_val}"] = count
                if count >= 3:
                    merged[field] = new_val
                    counts[field] = count
                    for key in list(counts.keys()):
                        if key.startswith(f"{field}_"):
                            del counts[key]

    existing_values = set(merged.get("values", []))
    new_values = set(new_traits.get("values", []))
    merged["values"] = sorted(existing_values | new_values)
    merged["_consistency_counts"] = counts
    return merged


def check_readiness(traits: dict) -> bool:
    if not traits:
        return False

    fields = list(VOLATILE_FIELDS | STABLE_FIELDS)
    filled = sum(1 for field in fields if traits.get(field) and traits[field] != "unknown")
    return filled >= 6 and len(traits.get("values", [])) >= 2
