from app.core.config import settings
from app.db.postgres import SessionLocal
from app.models.chunk import Chunk
from app.models.document import Document
from app.services.chunking import chunk_pages
from app.services.embeddings import embed_texts
from app.services.extract import extract_pages


def ingest_document(document_id: int) -> None:
    """Read the file, cut it into chunks, save them. Runs in the background after the upload."""
    db = SessionLocal()  # background tasks run after the request, so they open their own session
    try:
        doc = db.get(Document, document_id)
        pages = extract_pages(doc.storage_path)
        chunks = chunk_pages(pages, settings.chunk_size, settings.chunk_overlap)
        if not chunks:
            raise ValueError("No readable text found. Scanned PDFs (images of text) are not supported yet.")
        vectors = embed_texts([text for _, text in chunks])  # one list of numbers per chunk
        db.add_all(
            Chunk(document_id=doc.id, chunk_index=i, page=page, content=text, embedding=vector)
            for i, ((page, text), vector) in enumerate(zip(chunks, vectors))
        )
        doc.page_count = len(pages)
        doc.chunk_count = len(chunks)
        doc.status = "ready"
        db.commit()
    except Exception as exc:  # noqa: BLE001 - whatever went wrong, record it instead of crashing silently
        db.rollback()
        doc = db.get(Document, document_id)
        if doc is not None:
            doc.status = "failed"
            doc.error = str(exc)[:500]
            db.commit()
    finally:
        db.close()