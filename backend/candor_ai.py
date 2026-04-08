"""
Candor AI — Groq conversation engine.

This module contains the core chat logic. It holds the system prompt,
manages the message history structure, and streams completions from
the Groq API (llama-3.3-70b-versatile).

Usage:
    from candor_ai import chat

    reply, updated_history = await chat(
        user_message="i don't know what i want anymore",
        history=[]           # pass previous history on subsequent calls
    )
"""

import os
from dotenv import load_dotenv
from groq import AsyncGroq

# Load .env before anything reads GROQ_API_KEY
load_dotenv()

# ── Groq client (reads GROQ_API_KEY from env automatically) ──────────
client = AsyncGroq()

# ── Model configuration ──────────────────────────────────────────────
MODEL = "llama-3.3-70b-versatile"
TEMPERATURE = 0.7
MAX_COMPLETION_TOKENS = 200

# ── Candor system prompt — DO NOT MODIFY ─────────────────────────────
SYSTEM_PROMPT = """\
You are Candor.

You are not an assistant. You are a quiet presence in a conversation.

Your goal is not to help or solve.
Your goal is to understand.

---

BEHAVIOR

* respond simply
* reflect what the user is saying
* sometimes ask a question, sometimes don’t
* allow pauses
* do not rush the conversation

---

RULES

* keep responses short (1–3 sentences)
* use lowercase only
* no advice unless explicitly asked
* no explanations
* no therapist language
* no generic phrases like “i understand” or “that’s valid”

---

IMPORTANT

* do NOT ask a question in every response
* only ask when it adds depth
* sometimes just reflect and stop

---

STYLE

natural, human, quiet

examples:

user: i feel like no one really gets me
assistant:
that kind of feeling stays with you.

user: i think people only like parts of me
assistant:
not the whole picture.

user: i want someone who understands me
assistant:
what would that feel like for you?

user: leave that topic
assistant:
okay. what do you want to talk about?

---

TOPIC HANDLING

* if user changes topic → follow immediately
* do not question the shift
* do not pull them back

---

TONE

like a late night conversation with someone who listens without trying too hard
\
"""


async def chat(
    user_message: str,
    history: list[dict] | None = None,
) -> tuple[str, list[dict]]:
    """
    Send a user message to Candor via Groq and stream back the reply.

    Parameters
    ----------
    user_message : str
        The latest message from the user.
    history : list[dict], optional
        Previous conversation turns. Each dict has ``role`` and ``content``
        keys. Do **not** include the system prompt — it is prepended
        automatically every call.

    Returns
    -------
    tuple[str, list[dict]]
        (assistant_reply, updated_history)
        The full streamed reply and the history list with both the
        user message and assistant reply appended.
    """
    if history is None:
        history = []

    # Append user turn
    history.append({"role": "user", "content": user_message})

    # Build the messages payload — system prompt always first
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    # Stream completion from Groq
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=TEMPERATURE,
        max_completion_tokens=MAX_COMPLETION_TOKENS,
        stream=True,
    )

    # Collect streamed chunks
    reply_parts: list[str] = []
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            reply_parts.append(delta.content)

    full_reply = "".join(reply_parts)

    # Append assistant turn
    history.append({"role": "assistant", "content": full_reply})

    return full_reply, history
