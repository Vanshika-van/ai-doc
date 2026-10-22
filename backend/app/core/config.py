from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All settings live here. Values come from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "DocMind AI"
    database_url: str = "postgresql+psycopg://docmind:docmind@localhost:5432/docmind"
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "docmind"

    # Login settings. In real life, SECRET_KEY must be long, random and private.
    secret_key: str = "dev-secret-change-me-before-deploying-0123456789"
    access_token_minutes: int = 60



    # Uploaded files are saved here (inside the container)
    upload_dir: str = "uploads"
    max_upload_mb: int = 15

        # How we cut text into chunks (measured in characters)
    chunk_size: int = 900
    chunk_overlap: int = 150

settings = Settings()

