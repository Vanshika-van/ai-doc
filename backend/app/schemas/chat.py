from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    conversation_id: str | None = None  # empty = start a new conversation
    document_id: int | None = None      # empty = search all your documents


class Source(BaseModel):
    index: int  # the number used in the answer, like [1]
    document_id: int
    filename: str
    page: int
    score: float
    text: str


class ConversationOut(BaseModel):
    id: str
    title: str
    updated_at: datetime


class MessageOut(BaseModel):
    id: str
    role: str  # "user" or "assistant"
    content: str
    sources: list[Source] = []
    created_at: datetime


class ConversationDetail(ConversationOut):
    messages: list[MessageOut]