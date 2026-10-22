from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    document_id: int | None = None  # leave empty to search all your documents


class SearchHit(BaseModel):
    document_id: int
    filename: str
    page: int
    score: float
    text: str