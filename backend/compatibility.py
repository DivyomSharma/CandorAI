"""
Candor Compatibility Engine — organic matching.

Scores two users based on inferred traits.
Returns a score + human-readable reason.
Never exposes raw traits to users.
"""

# ── Weights ───────────────────────────────────────────────────────────

WEIGHTS = {
    "emotional_depth": 0.25,
    "values": 0.25,
    "communication_style": 0.15,
    "attachment": 0.15,
    "empathy_level": 0.10,
    "emotional_regulation": 0.10,
}

# ── Compatibility maps ───────────────────────────────────────────────

# Same = good
ALIGNMENT_FIELDS = {"emotional_depth", "empathy_level", "emotional_regulation"}

# Compatible pairs for communication
COMMUNICATION_COMPAT = {
    ("direct", "direct"): 1.0,
    ("direct", "expressive"): 0.7,
    ("expressive", "expressive"): 0.9,
    ("reserved", "reserved"): 0.8,
    ("reserved", "indirect"): 0.6,
    ("indirect", "indirect"): 0.5,
    ("direct", "reserved"): 0.4,
    ("direct", "indirect"): 0.3,
    ("expressive", "reserved"): 0.5,
    ("expressive", "indirect"): 0.4,
}

# Attachment complement scoring
ATTACHMENT_COMPAT = {
    ("secure", "secure"): 1.0,
    ("secure", "anxious"): 0.6,
    ("secure", "avoidant"): 0.6,
    ("anxious", "anxious"): 0.3,
    ("avoidant", "avoidant"): 0.3,
    ("anxious", "avoidant"): 0.2,
}

# ── Reason templates ─────────────────────────────────────────────────

REASONS = {
    "emotional_depth": "you both seek depth in conversation",
    "values": "you share what matters most",
    "communication_style": "the way you express yourselves fits",
    "attachment": "how you connect with people aligns",
    "empathy_level": "you both care deeply about understanding others",
    "emotional_regulation": "you handle emotions in a similar way",
}

VALUE_REASONS = [
    "you both value {v}",
    "you share a sense of {v}",
    "{v} matters to both of you",
]


def _get_pair_score(a_val: str, b_val: str, compat_map: dict) -> float:
    """Look up compatibility in both directions."""
    pair = (a_val, b_val)
    reverse = (b_val, a_val)
    return compat_map.get(pair, compat_map.get(reverse, 0.5))


def score_compatibility(a: dict, b: dict) -> dict:
    """
    Score compatibility between two user trait profiles.

    Returns
    -------
    dict
        { "score": float (0-1), "reason": str }
    """
    if not a or not b:
        return {"score": 0.0, "reason": "not enough understanding yet"}

    total_score = 0.0
    best_reason_field = ""
    best_reason_score = 0.0

    # Alignment fields (same = good)
    for field in ALIGNMENT_FIELDS:
        a_val = a.get(field, "unknown")
        b_val = b.get(field, "unknown")
        weight = WEIGHTS.get(field, 0)

        if a_val == "unknown" or b_val == "unknown":
            field_score = 0.5  # neutral if unknown
        elif a_val == b_val:
            field_score = 1.0
        else:
            field_score = 0.4

        total_score += field_score * weight
        if field_score * weight > best_reason_score:
            best_reason_score = field_score * weight
            best_reason_field = field

    # Communication compatibility
    a_comm = a.get("communication_style", "unknown")
    b_comm = b.get("communication_style", "unknown")
    comm_weight = WEIGHTS["communication_style"]

    if a_comm == "unknown" or b_comm == "unknown":
        comm_score = 0.5
    else:
        comm_score = _get_pair_score(a_comm, b_comm, COMMUNICATION_COMPAT)

    total_score += comm_score * comm_weight
    if comm_score * comm_weight > best_reason_score:
        best_reason_score = comm_score * comm_weight
        best_reason_field = "communication_style"

    # Attachment complement
    a_att = a.get("attachment", "unknown")
    b_att = b.get("attachment", "unknown")
    att_weight = WEIGHTS["attachment"]

    if a_att == "unknown" or b_att == "unknown":
        att_score = 0.5
    else:
        att_score = _get_pair_score(a_att, b_att, ATTACHMENT_COMPAT)

    total_score += att_score * att_weight
    if att_score * att_weight > best_reason_score:
        best_reason_score = att_score * att_weight
        best_reason_field = "attachment"

    # Values overlap
    a_values = set(a.get("values", []))
    b_values = set(b.get("values", []))
    values_weight = WEIGHTS["values"]

    if not a_values or not b_values:
        values_score = 0.5
    else:
        overlap = a_values & b_values
        union = a_values | b_values
        values_score = len(overlap) / len(union) if union else 0.5

    total_score += values_score * values_weight

    # Build reason
    shared_values = list(a_values & b_values)
    if shared_values and values_score * values_weight >= best_reason_score:
        import random
        template = random.choice(VALUE_REASONS)
        reason = template.format(v=shared_values[0])
    elif best_reason_field:
        reason = REASONS.get(best_reason_field, "something quiet connects you")
    else:
        reason = "something quiet connects you"

    return {
        "score": round(min(max(total_score, 0.0), 1.0), 3),
        "reason": reason,
    }
