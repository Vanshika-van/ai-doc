from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration lives here. Values come from environment variables (or a .env file)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "DocMind AI"
    database_url: str = "postgresql+psycopg://docmind:docmind@localhost:5432/docmind"
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "docmind"

    # Auth. In production SECRET_KEY must be a long random value set in .env
    secret_key: str = "dev-secret-change-me-before-deploying-0123456789"
    access_token_minutes: int = 60

    # Uploaded files are saved here (inside the container)
    upload_dir: str = "uploads"
    max_upload_mb: int = 15

    # How we cut text into chunks (measured in characters)
    chunk_size: int = 900
    chunk_overlap: int = 150

    # Embeddings and search
    embedding_dim: int = 1024           # how many numbers describe one chunk
    top_k: int = 5                      # how many chunks a search returns
    min_score: float = 0.05             # ignore chunks that are barely related
    openai_api_key: str = ""            # optional: real "meaning" embeddings (see embeddings.py)
    embedding_model: str = "text-embedding-3-small"

    
    # The AI that writes answers. Without a key the app runs in "offline mode".
    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-5-5"


settings = Settings()