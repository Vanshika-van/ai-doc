from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.postgres import Base


class Chunk(Base):
    """A small piece of a document (about 900 characters). The AI will search over these."""

    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer)  # 0, 1, 2... the order inside the document
    page: Mapped[int] = mapped_column(Integer)         # which page it came from (needed for citations)
    content: Mapped[str] = mapped_column(Text)
    # The chunk's meaning as a list of 1024 numbers. Similar meaning = similar numbers.
    embedding: Mapped[list[float]] = mapped_column(Vector(settings.embedding_dim))

    document = relationship("Document", back_populates="chunks")