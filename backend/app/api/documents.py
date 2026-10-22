import os
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.postgres import get_db
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.user import User
from app.schemas.document import ChunkOut, DocumentOut
from app.services.ingest import ingest_document

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}


def get_own_document(db: Session, user: User, document_id: int) -> Document:
    """Find a document, but ONLY if it belongs to this user. Others get 404, never 403 (don't leak existence)."""
    doc = db.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return doc


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Path(...).name keeps only the file name, so "../../etc/passwd" cannot escape our folder
    original_name = Path(file.filename or "document").name
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a PDF, TXT or Markdown file.")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    content = await file.read(max_bytes + 1)  # read one byte too many to detect "too big"
    if len(content) > max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"File is larger than {settings.max_upload_mb} MB.")
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The file is empty.")

    # Save under a random name in a per-user folder, so two files called "notes.pdf" never clash
    folder = Path(settings.upload_dir) / str(user.id)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{uuid.uuid4().hex}{suffix}"
    path.write_bytes(content)

    doc = Document(
        user_id=user.id,
        filename=original_name,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        storage_path=str(path),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    background_tasks.add_task(ingest_document, doc.id)  # reading and chunking happen AFTER we reply
    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc(), Document.id.desc())
    ).all()


@router.get("/{document_id}/chunks", response_model=list[ChunkOut])
def list_chunks(document_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Show the pieces a document was cut into (handy to check that chunking worked)."""
    doc = get_own_document(db, user, document_id)
    return db.scalars(select(Chunk).where(Chunk.document_id == doc.id).order_by(Chunk.chunk_index)).all()


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = get_own_document(db, user, document_id)
    path = doc.storage_path
    db.delete(doc)
    db.commit()
    try:
        os.remove(path)  # also remove the file from disk
    except OSError:
        pass