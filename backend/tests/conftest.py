import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.db.postgres import Base, get_db
from app.main import app


@pytest.fixture
def client(monkeypatch):
    """A test client wired to a throwaway in-memory SQLite database, so tests need no Docker."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    # background ingestion opens its own session: point it at the test database too
    monkeypatch.setattr("app.services.ingest.SessionLocal", Session)
    app.dependency_overrides[get_db] = override_get_db  # swap the real DB for the test one
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()