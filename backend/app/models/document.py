from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.postgres import Base


class Document(Base):
    """One row per uploaded file. The file itself lives on disk; this row remembers where."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    # ForeignKey links each document to its owner. If the user is deleted, their documents go too.
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))       # the name the user saw, e.g. "notes.pdf"
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    storage_path: Mapped[str] = mapped_column(String(500))   # where we saved it on disk
    status: Mapped[str] = mapped_column(String(20), default="processing")  # processing -> ready, or failed
    error: Mapped[str | None] = mapped_column(Text, nullable=True)         # why it failed, if it did
    page_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # One document has many chunks. Deleting the document deletes its chunks too.
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")