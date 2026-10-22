import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.postgres import get_db
from app.models.user import User
from app.schemas.chat import ChatRequest, ConversationDetail, ConversationOut
from app.services import conversations as store
from app.services import llm
from app.services.search import search_chunks

log = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


def sse(event: str, data: dict) -> str:
    """Format one Server-Sent Event: a named message the browser can read while the response is still open."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@router.post("/stream")
async def chat_stream(body: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Find the conversation (MongoDB) or start a new one
    if body.conversation_id:
        conversation = await store.get_conversation(user.id, body.conversation_id)
        if conversation is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
    else:
        conversation = await store.create_conversation(user.id, body.question.strip()[:60])
    conversation_id = conversation["_id"]
    history = await store.recent_history(conversation_id)  # read BEFORE saving the new question

    # 2. RETRIEVE the best chunks (Postgres + pgvector). Done now, so the DB session isn't needed while streaming.
    hits = await run_in_threadpool(search_chunks, db, user.id, body.question, body.document_id)
    sources = [{"index": i, **hit} for i, hit in enumerate(hits, start=1)]

    await store.add_message(conversation_id, "user", body.question)

    # 3. GENERATE and stream the answer piece by piece
    async def event_stream() -> AsyncIterator[str]:
        yield sse("meta", {"conversation_id": str(conversation_id), "sources": sources})
        parts: list[str] = []
        try:
            async for piece in llm.stream_answer(body.question, sources, history):
                parts.append(piece)
                yield sse("token", {"text": piece})
        except Exception:  # noqa: BLE001 - never show the provider's raw error to the user
            log.exception("AI streaming failed")
            yield sse("error", {"message": "The AI service failed to answer. Check your API key and try again."})
            return
        saved = await store.add_message(conversation_id, "assistant", "".join(parts), sources)
        yield sse("done", {"message_id": str(saved["_id"])})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},  # no buffering: send pieces immediately
    )


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(user: User = Depends(get_current_user)):
    return [store.conversation_out(d) for d in await store.list_conversations(user.id)]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: str, user: User = Depends(get_current_user)):
    conversation = await store.get_conversation(user.id, conversation_id)
    if conversation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
    messages = await store.get_messages(conversation["_id"])
    return {**store.conversation_out(conversation), "messages": [store.message_out(m) for m in messages]}


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str, user: User = Depends(get_current_user)):
    if not await store.delete_conversation(user.id, conversation_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")