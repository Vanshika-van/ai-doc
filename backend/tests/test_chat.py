import json

import pytest
from mongomock_motor import AsyncMongoMockClient

from app.core.config import settings
from app.services import llm

HITS = [
    {"document_id": 1, "filename": "contract.txt", "page": 1, "score": 0.5, "text": "Late invoices accrue interest at 1.5 percent."},
    {"document_id": 1, "filename": "contract.txt", "page": 2, "score": 0.3, "text": "Either party may terminate with sixty days notice."},
]


@pytest.fixture(autouse=True)
def fakes(monkeypatch):
    mongo = AsyncMongoMockClient()["test"]  # an in-memory MongoDB, so tests need no Docker
    monkeypatch.setattr("app.services.conversations.get_mongo", lambda: mongo)
    monkeypatch.setattr("app.api.chat.search_chunks", lambda db, user_id, question, document_id=None: HITS)
    monkeypatch.setattr(settings, "anthropic_api_key", "")


def signup(client, email="ana@example.com"):
    res = client.post("/api/auth/register", json={"email": email, "name": "Ana", "password": "password123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def chat(client, headers, question="What interest applies?", **extra):
    """Send a question and return (status, events) where events is a list of (name, data)."""
    res = client.post("/api/chat/stream", headers=headers, json={"question": question, **extra})
    events = []
    for block in res.text.split("\n\n") if res.status_code == 200 else []:  # errors are plain JSON, not events
        if block.strip():
            name, data = block.split("\n")
            events.append((name.removeprefix("event: "), json.loads(data.removeprefix("data: "))))
    return res.status_code, events


def answer_of(events):
    return "".join(d["text"] for name, d in events if name == "token")


def test_offline_stream_sends_meta_then_tokens_then_done(client):
    code, events = chat(client, signup(client))
    assert code == 200
    assert [n for n, _ in events][0] == "meta" and events[-1][0] == "done"
    meta = events[0][1]
    assert [s["index"] for s in meta["sources"]] == [1, 2] and meta["conversation_id"]
    assert sum(1 for n, _ in events if n == "token") > 5  # many small pieces, not one block
    assert "Late invoices accrue interest" in answer_of(events) and "[1]" in answer_of(events)


def test_conversation_is_saved_and_continues(client):
    h = signup(client)
    _, events = chat(client, h)
    conversation_id = events[0][1]["conversation_id"]
    chat(client, h, question="And how do I terminate?", conversation_id=conversation_id)

    listing = client.get("/api/chat/conversations", headers=h).json()
    assert len(listing) == 1 and listing[0]["title"] == "What interest applies?"
    detail = client.get(f"/api/chat/conversations/{conversation_id}", headers=h).json()
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant", "user", "assistant"]
    assert detail["messages"][1]["sources"][0]["page"] == 1  # citations are saved with the answer


def test_claude_receives_the_conversation_history(client, monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    seen = []

    async def fake_claude(question, sources, history):
        seen.append([m["content"] for m in history])
        yield "Answer "
        yield f"to: {question}"

    monkeypatch.setattr(llm, "stream_claude", fake_claude)
    h = signup(client)
    _, events = chat(client, h, question="First question")
    chat(client, h, question="Second question", conversation_id=events[0][1]["conversation_id"])
    assert seen[0] == [] and seen[1] == ["First question", "Answer to: First question"]


def test_nothing_found_gives_polite_reply(client, monkeypatch):
    monkeypatch.setattr("app.api.chat.search_chunks", lambda *a, **k: [])
    _, events = chat(client, signup(client))
    assert events[0][1]["sources"] == [] and answer_of(events) == llm.NO_SOURCES_REPLY


def test_ai_failure_sends_clean_error_and_saves_no_answer(client, monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")

    async def broken(question, sources, history):
        raise RuntimeError("401 invalid x-api-key")
        yield  # makes this an async generator

    monkeypatch.setattr(llm, "stream_claude", broken)
    h = signup(client)
    _, events = chat(client, h)
    assert events[-1][0] == "error" and "x-api-key" not in json.dumps(events)
    conversation_id = events[0][1]["conversation_id"]
    detail = client.get(f"/api/chat/conversations/{conversation_id}", headers=h).json()
    assert [m["role"] for m in detail["messages"]] == ["user"]


def test_users_cannot_touch_each_others_conversations(client):
    ana, bob = signup(client, "ana@example.com"), signup(client, "bob@example.com")
    conversation_id = chat(client, ana)[1][0][1]["conversation_id"]
    assert client.get("/api/chat/conversations", headers=bob).json() == []
    assert client.get(f"/api/chat/conversations/{conversation_id}", headers=bob).status_code == 404
    assert client.delete(f"/api/chat/conversations/{conversation_id}", headers=bob).status_code == 404
    assert chat(client, bob, conversation_id=conversation_id)[0] == 404
    assert client.delete(f"/api/chat/conversations/{conversation_id}", headers=ana).status_code == 204
    assert client.get("/api/chat/conversations", headers=ana).json() == []


def test_login_required_and_bad_input(client):
    assert client.post("/api/chat/stream", json={"question": "hello there"}).status_code == 401
    assert client.get("/api/chat/conversations").status_code == 401
    h = signup(client)
    assert chat(client, h, question="a")[0] == 422
    assert client.get("/api/chat/conversations/not-a-real-id", headers=h).status_code == 404