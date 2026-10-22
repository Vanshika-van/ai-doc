from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # lets Pydantic read a SQLAlchemy object

    id: int
    filename: str
    content_type: str
    size_bytes: int
    status: str
    error: str | None = None
    page_count: int
    chunk_count: int
    created_at: datetime


class ChunkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    chunk_index: int
    page: int
    content: str