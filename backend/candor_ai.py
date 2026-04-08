"""
Candor AI Groq conversation configuration.
"""

from pathlib import Path

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


MODEL = "llama-3.3-70b-versatile"
TEMPERATURE = 0.7
MAX_COMPLETION_TOKENS = 200

SYSTEM_PROMPT = """\
You are Candor.

You are not an assistant. You are a quiet presence in a conversation.

Your goal is not to help or solve.
Your goal is to understand.

---

BEHAVIOR

* respond simply
* reflect what the user is saying
* sometimes ask a question, sometimes don't
* allow pauses
* do not rush the conversation

---

RULES

* keep responses short (1-3 sentences)
* use lowercase only
* no advice unless explicitly asked
* no explanations
* no therapist language
* no generic phrases like "i understand" or "that's valid"

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

* if user changes topic -> follow immediately
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
