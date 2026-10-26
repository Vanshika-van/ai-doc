"""Writing the answer: with a local Ollama model, with Claude, or in offline mode (no AI)."""
import asyncio
import json
from collections.abc import AsyncIterator

import httpx

from app.core.config import settings

# The system prompt is the rulebook we give the AI before every question.
SYSTEM_PROMPT = """You are DocMind, an assistant that answers questions using only the numbered sources provided.

Rules:
- Use only facts that appear in the sources. If they do not contain the answer, say so plainly.
- Cite every claim with its source number in square brackets, like [1] or [2][3].
- Keep answers short and direct. Use bullet points only for real lists.
- Never invent source numbers."""


class AIUnavailable(Exception):
    """An error whose message is safe and useful to show to the user."""


_transport = None  # tests put a fake network here


NO_SOURCES_REPLY = (
    "I couldn't find anything about that in your documents. "
    "Try rephrasing the question, or check that your documents are Ready."
)


def build_context(sources: list[dict]) -> str:
    """Turn the chunks into the numbered text block that the AI reads."""
    blocks = []
    for s in sources:
        blocks.append(f"[{s['index']}] ({s['filename']}, page {s['page']})\n{s['text']}")
    return "\n\n".join(blocks)


def clean_history(history: list[dict]) -> list[dict]:
    """Keep the last 6 messages, and make sure the list starts with a user message."""
    turns = [{"role": m["role"], "content": m["content"]} for m in history[-6:] if m["content"]]
    while turns and turns[0]["role"] != "user":
        turns.pop(0)
    return turns


async def stream_offline(sources: list[dict]) -> AsyncIterator[str]:
    best = sources[0]
    text = (
        "Offline mode: no AI is configured, so I can't write an answer. "
        f"This is the closest passage I found:\n\n{best['text'].strip()} [{best['index']}]"
    )
    for word in text.split(" "):
        yield word + " "
        await asyncio.sleep(0.02)  # a tiny pause so you can see the streaming effect


async def stream_ollama(question: str, sources: list[dict], history: list[dict]) -> AsyncIterator[str]:
    """Ask the local Ollama server. It streams one JSON object per line."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + clean_history(history) + [
        {
            "role": "user",
            "content": (
                f"Sources:\n\n{build_context(sources)}\n\n"
                f"Question: {question}\n\n"
                "Answer using only the sources above and cite them like [1]."
            ),
        }
    ]
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": True,
        "options": {"temperature": 0.2, "num_ctx": 4096},  # low temperature = sticks to the sources
    }
    url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    try:
        async with httpx.AsyncClient(transport=_transport, timeout=httpx.Timeout(300.0, connect=10.0)) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code == 404:
                    raise AIUnavailable(
                        f"Ollama does not have the model \"{settings.ollama_model}\". "
                        f"Run: ollama pull {settings.ollama_model}"
                    )
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    data = json.loads(line)
                    if data.get("error"):
                        raise AIUnavailable(f"Ollama said: {data['error']}")
                    if data.get("message", {}).get("content"):
                        yield data["message"]["content"]
                    if data.get("done"):
                        break
    except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
        raise AIUnavailable(
            "Could not reach Ollama. Start the Ollama app on your computer, then ask again."
        ) from exc


async def stream_claude(question: str, sources: list[dict], history: list[dict]) -> AsyncIterator[str]:
    from anthropic import AsyncAnthropic  # imported here so the app starts even without the package

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    messages = clean_history(history) + [
        {"role": "user", "content": f"Sources:\n\n{build_context(sources)}\n\nQuestion: {question}"}
    ]
    async with client.messages.stream(
        model=settings.claude_model, max_tokens=1024, system=SYSTEM_PROMPT, messages=messages
    ) as stream:
        async for text in stream.text_stream:
            yield text


def active_provider() -> str:
    """Decide who writes the answer: claude, ollama or offline."""
    if settings.llm_provider != "auto":
        return settings.llm_provider
    return "claude" if settings.anthropic_api_key else "ollama"


async def stream_answer(question: str, sources: list[dict], history: list[dict]) -> AsyncIterator[str]:
    if not sources:
        yield NO_SOURCES_REPLY
        return
    provider = active_provider()
    if provider == "claude":
        writer = stream_claude(question, sources, history)
    elif provider == "ollama":
        writer = stream_ollama(question, sources, history)
    else:
        writer = stream_offline(sources)
    async for piece in writer:
        yield piece