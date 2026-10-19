from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# The engine manages the connection to Postgres. It only connects when first used.
engine = create_engine(settings.database_url, pool_pre_ping=True)

# A session is one "conversation" with the database. We open one per request.
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Every table class we write later (User, Document...) will inherit from this."""


def get_db():
    """Give each request a database session and always close it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()