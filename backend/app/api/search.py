from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.postgres import get_db
from app.models.user import User
from app.schemas.search import SearchHit, SearchRequest
from app.services.search import search_chunks

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=list[SearchHit])
async def search(body: SearchRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await run_in_threadpool(search_chunks, db, user.id, body.question, body.document_id)