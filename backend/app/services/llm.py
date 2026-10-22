"""Talking to Claude. If there is no API key, we fall back to "offline mode"."""
import asyncio
from collections.abc import AsyncIterator

from app.core.config import settings

# The system prompt is the rulebook we give the AI before every question.
SYSTEM_PROMPT = """You are DocMind, an assistant that answers questions using only the numbered sources provided.

Rules:
- Use only facts that appear in the sources. If they do not contain the answer, say so plainly.
- Cite every claim with its source number in square brackets, like [1] or [2][3].
- Keep answers short and direct. Use bullet points only for real lists.
- Never invent source numbers."""

NO_SOURCES_REPLY = (
    "I couldn't find anything about that in your documents. "
    "Try rephrasing the question, or check that your documents are Ready."
)


def build_context(sources: list[dict]) -> str:
    """Turn the chunks into the numbered text block that Claude reads."""
    blocks = []
    for s in sources:
        blocks.append(f"[{s['index']}] ({s['filename']}, page {s['page']})\n{s['text']}")
    return "\n\n".join(blocks)


def clean_history(history: list[dict]) -> list[dict]:
    """Keep the last 6 messages, and make sure the list starts with a user message (Claude requires it)."""
    turns = [{"role": m["role"], "content": m["content"]} for m in history[-6:] if m["content"]]
    while turns and turns[0]["role"] != "user":
        turns.pop(0)
    return turns


async def stream_offline(sources: list[dict]) -> AsyncIterator[str]:
    best = sources[0]
    text = (
        "Offline mode: no ANTHROPIC_API_KEY is set, so I can't write an answer. "
        f"This is the closest passage I found:\n\n{best['text'].strip()} [{best['index']}]"
    )
    for word in text.split(" "):
        yield word + " "
        await asyncio.sleep(0.02)  # a tiny pause so you can see the streaming effect


async def stream_claude(question: str, sources: list[dict], history: list[dict]) -> AsyncIterator[str]:
    from anthropic import AsyncAnthropic  # imported here so the app starts even without the package

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    # Earlier messages give Claude the memory of the conversation; the new question comes with fresh sources
    messages = clean_history(history) + [
        {"role": "user", "content": f"Sources:\n\n{build_context(sources)}\n\nQuestion: {question}"}
    ]
    async with client.messages.stream(
        model=settings.llm_model, max_tokens=1024, system=SYSTEM_PROMPT, messages=messages
    ) as stream:
        async for text in stream.text_stream:  # pieces arrive as Claude writes them
            yield text


async def stream_answer(question: str, sources: list[dict], history: list[dict]) -> AsyncIterator[str]:
    if not sources:
        yield NO_SOURCES_REPLY
    elif not settings.anthropic_api_key:
        async for piece in stream_offline(sources):
            yield piece
    else:
        async for piece in stream_claude(question, sources, history):
            yield piece