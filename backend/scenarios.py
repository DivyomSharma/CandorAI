"""
Candor scenario pool.

Each scenario has:
  id      — unique slug
  label   — displayed prefix (e.g. "imagine this")
  text    — the 2-3 line scenario body
  question — the closing question shown to the user
  tags    — trait affinities used for personalised selection

Tags map to profile fields:
  conflict_style: avoid | confront | reflect | escalate | withdraw
  attachment: anxious | avoidant | secure | disorganized
  emotional_style: intense | gentle
  expectations: high
  communication_style: indirect | direct | reserved
  values: honesty | independence | emotional_safety | loyalty | etc.
  general: universal (no affinity — used as fallback / variety)
"""

from __future__ import annotations

import random
from typing import TypedDict


class Scenario(TypedDict):
    id: str
    label: str
    text: str
    question: str
    tags: list[str]


# ---------------------------------------------------------------------------
# The pool
# ---------------------------------------------------------------------------

SCENARIOS: list[Scenario] = [
    # ----- Emotional validation / invalidation -----
    {
        "id": "excited_no_reaction",
        "label": "imagine this",
        "text": "you're excited about something\nand the person you care about barely reacts.",
        "question": "what stays with you more?",
        "tags": ["attachment:anxious", "expectations:high", "emotional_style:intense", "values:emotional_safety"],
    },
    {
        "id": "crying_alone",
        "label": "imagine this",
        "text": "you're having a hard day.\nyou don't tell anyone.\nyou handle it alone.",
        "question": "is that by choice — or habit?",
        "tags": ["attachment:avoidant", "conflict_style:withdraw", "communication_style:reserved"],
    },
    {
        "id": "unsent_message",
        "label": "picture this",
        "text": "you write a long message to someone.\nthen you delete it without sending.",
        "question": "what made you stop?",
        "tags": ["conflict_style:avoid", "communication_style:indirect", "attachment:anxious"],
    },
    {
        "id": "apology_not_enough",
        "label": "imagine this",
        "text": "someone apologises.\nbut something in you still can't move on.",
        "question": "what would actually help?",
        "tags": ["expectations:high", "conflict_style:reflect", "values:honesty"],
    },
    {
        "id": "noticed_last",
        "label": "picture this",
        "text": "everyone in the room is talking.\nyou say something — and nobody responds.\nthen someone else says the same thing, and they laugh.",
        "question": "what do you do with that feeling?",
        "tags": ["emotional_style:intense", "attachment:anxious", "values:recognition"],
    },

    # ----- Conflict and confrontation -----
    {
        "id": "conflict_shutdown",
        "label": "imagine this",
        "text": "you're in the middle of an argument.\nthe other person goes completely silent.",
        "question": "does that make things worse, or better?",
        "tags": ["conflict_style:confront", "conflict_style:escalate", "attachment:anxious"],
    },
    {
        "id": "right_but_quiet",
        "label": "picture this",
        "text": "you know you're right.\nbut saying it would make things ugly.\nso you stay quiet.",
        "question": "how often do you do that?",
        "tags": ["conflict_style:avoid", "conflict_style:withdraw", "values:peace"],
    },
    {
        "id": "first_to_apologise",
        "label": "imagine this",
        "text": "you weren't the one who started it.\nbut you're always the first to say sorry.",
        "question": "why do you think that is?",
        "tags": ["conflict_style:avoid", "attachment:anxious", "expectations:high"],
    },
    {
        "id": "point_proven_empty",
        "label": "picture this",
        "text": "you win the argument.\nbut later it feels hollow.",
        "question": "what were you actually fighting for?",
        "tags": ["conflict_style:confront", "emotional_style:intense", "values:honesty"],
    },

    # ----- Expectations and assumptions -----
    {
        "id": "should_have_known",
        "label": "imagine this",
        "text": "you needed something from someone.\nyou didn't ask.\nyou assumed they'd just know.",
        "question": "do you find yourself doing that often?",
        "tags": ["expectations:high", "communication_style:indirect", "attachment:anxious"],
    },
    {
        "id": "plans_cancelled",
        "label": "picture this",
        "text": "someone cancels plans with you last minute.\nfor the third time.",
        "question": "what do you tell yourself about it?",
        "tags": ["attachment:anxious", "expectations:high", "emotional_style:intense"],
    },
    {
        "id": "effort_not_matched",
        "label": "imagine this",
        "text": "you always put in more than the other person.\nyou've noticed it.\nbut you haven't said anything.",
        "question": "what is it that stops you?",
        "tags": ["expectations:high", "conflict_style:avoid", "values:fairness"],
    },

    # ----- Independence and closeness -----
    {
        "id": "need_space_guilt",
        "label": "picture this",
        "text": "you need some time alone.\nbut asking for it feels like you're hurting someone.",
        "question": "do you usually just push through instead?",
        "tags": ["attachment:avoidant", "conflict_style:avoid", "values:independence"],
    },
    {
        "id": "closer_pulls_back",
        "label": "imagine this",
        "text": "every time you feel yourself getting close to someone —\nsomething in you pulls back.",
        "question": "is that a decision or a reflex?",
        "tags": ["attachment:avoidant", "attachment:disorganized", "conflict_style:withdraw"],
    },
    {
        "id": "too_much_too_soon",
        "label": "picture this",
        "text": "you open up to someone early.\nthen immediately wonder if you said too much.",
        "question": "what made you want to share that much?",
        "tags": ["attachment:anxious", "communication_style:expressive", "emotional_style:intense"],
    },

    # ----- Trust and loyalty -----
    {
        "id": "secret_shared",
        "label": "imagine this",
        "text": "you told someone something in confidence.\nlater, it came up — in a way it shouldn't have.",
        "question": "how long does something like that stay with you?",
        "tags": ["values:honesty", "values:loyalty", "attachment:anxious", "emotional_style:intense"],
    },
    {
        "id": "trust_again",
        "label": "picture this",
        "text": "someone let you down badly once.\nnow they want to try again.",
        "question": "what would trusting them again actually mean?",
        "tags": ["attachment:anxious", "attachment:disorganized", "values:loyalty"],
    },
    {
        "id": "waiting_for_proof",
        "label": "imagine this",
        "text": "someone keeps telling you they care.\nbut you need to see it — not hear it.",
        "question": "what would that look like for you?",
        "tags": ["attachment:anxious", "expectations:high", "values:honesty"],
    },

    # ----- Self-worth and identity -----
    {
        "id": "compliment_deflect",
        "label": "picture this",
        "text": "someone gives you a genuine compliment.\nyou immediately downplay it.",
        "question": "why doesn't it land?",
        "tags": ["emotional_style:gentle", "communication_style:reserved", "values:humility"],
    },
    {
        "id": "done_a_lot_invisible",
        "label": "imagine this",
        "text": "you've done a lot for someone.\nbut they don't seem to notice.",
        "question": "does being unseen make you want to do less — or more?",
        "tags": ["expectations:high", "values:recognition", "emotional_style:intense"],
    },
    {
        "id": "successful_empty",
        "label": "picture this",
        "text": "you hit something you were working toward.\nbut the feeling after was quieter than you expected.",
        "question": "what did you think it would feel like?",
        "tags": ["values:achievement", "emotional_style:gentle", "communication_style:reserved"],
    },

    # ----- Communication -----
    {
        "id": "wrong_words_right_feeling",
        "label": "imagine this",
        "text": "you knew exactly what you felt.\nbut when you tried to say it — the words came out wrong.\nand the moment passed.",
        "question": "does that happen a lot?",
        "tags": ["communication_style:indirect", "communication_style:reserved", "conflict_style:avoid"],
    },
    {
        "id": "tone_misread",
        "label": "picture this",
        "text": "you said something completely normal.\nbut somehow the other person took it wrong.",
        "question": "what do you usually do when that happens?",
        "tags": ["communication_style:direct", "conflict_style:reflect", "attachment:anxious"],
    },

    # ----- Universal / no-affinity fallbacks -----
    {
        "id": "three_am",
        "label": "imagine this",
        "text": "it's 3am and you can't sleep.\nyou're thinking about one specific thing.",
        "question": "what is it?",
        "tags": ["general"],
    },
    {
        "id": "one_thing_change",
        "label": "picture this",
        "text": "you could change one thing about how you are in relationships.\njust one.",
        "question": "what would it be?",
        "tags": ["general"],
    },
    {
        "id": "leaving_party",
        "label": "imagine this",
        "text": "you leave a gathering early.\non the way home, you're replaying one moment from it.",
        "question": "what moment is it?",
        "tags": ["general"],
    },
]

# Build a fast lookup map
_SCENARIO_BY_ID: dict[str, Scenario] = {s["id"]: s for s in SCENARIOS}


# ---------------------------------------------------------------------------
# Selection logic
# ---------------------------------------------------------------------------

def _score_scenario(scenario: Scenario, profile: dict) -> int:
    """
    Score how well a scenario matches a user's profile.
    Each matching tag adds 1 point.
    'general' tagged scenarios score 0 (they're pure fallbacks).
    """
    if "general" in scenario["tags"]:
        return 0

    score = 0
    for tag in scenario["tags"]:
        if ":" in tag:
            field, value = tag.split(":", 1)
            profile_val = profile.get(field, "")
            # Match against string value or list (for 'values' field)
            if isinstance(profile_val, list):
                if value in profile_val:
                    score += 1
            elif profile_val == value:
                score += 1
        # bare tags (legacy) — skip
    return score


def select_scenario(profile: dict, seen_ids: list[str]) -> Scenario:
    """
    Pick the best-matching unseen scenario for this user.

    Algorithm:
    1. Filter out already-seen scenarios
    2. Score each remaining by trait affinity
    3. Group into: best-scoring, mid, zero
    4. Pick randomly from the best group (adds variety within same persona)
    5. If all seen, reset and pick from full pool

    Returns a Scenario dict.
    """
    seen_set = set(seen_ids)
    unseen = [s for s in SCENARIOS if s["id"] not in seen_set]

    # If user has exhausted all scenarios, reset (their profile has likely evolved too)
    if not unseen:
        unseen = list(SCENARIOS)

    if not profile:
        # No profile yet — pick random from general pool
        return random.choice(unseen)

    # Score all unseen
    scored = [(s, _score_scenario(s, profile)) for s in unseen]
    max_score = max(sc for _, sc in scored)

    if max_score == 0:
        # No profile match — pick from general tags + random variety
        generals = [s for s in unseen if "general" in s["tags"]]
        return random.choice(generals if generals else unseen)

    # Build candidate tiers
    best = [s for s, sc in scored if sc == max_score]
    # Pick randomly within best tier for variety
    return random.choice(best)


def get_scenario_by_id(scenario_id: str) -> Scenario | None:
    return _SCENARIO_BY_ID.get(scenario_id)
