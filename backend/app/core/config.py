from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All settings live here. Values come from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "DocMind AI"
    database_url: str = "postgresql+psycopg://docmind:docmind@localhost:5432/docmind"
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "docmind"


settings = Settings()