from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chunk import Chunk
from app.models.document import Document
from app.services.embeddings import embed_query


def search_chunks(db: Session, user_id: int, question: str, document_id: int | None = None) -> list[dict]:
    """Find the chunks closest in meaning to the question. Only the user's own, finished documents."""
    query_vector = embed_query(question)
    # cosine_distance: 0 = identical direction, 2 = opposite. Postgres + pgvector compute it for us.
    distance = Chunk.embedding.cosine_distance(query_vector)

    stmt = (
        select(Chunk, Document.filename, (1 - distance).label("score"))  # score: higher = better match
        .join(Document, Document.id == Chunk.document_id)
        .where(Document.user_id == user_id, Document.status == "ready")
        .order_by(distance)  # closest first
        .limit(settings.top_k)
    )
    if document_id is not None:
        stmt = stmt.where(Document.id == document_id)

    results = []
    for chunk, filename, score in db.execute(stmt).all():
        if score < settings.min_score:
            continue
        results.append(
            {
                "document_id": chunk.document_id,
                "filename": filename,
                "page": chunk.page,
                "score": round(float(score), 3),
                "text": chunk.content,
            }
        )
    return results