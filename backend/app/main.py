from fastapi import FastAPI
from sqlalchemy import text

from app.core.config import settings
from app.db.mongo import get_mongo
from app.db.postgres import engine

app = FastAPI(title=settings.app_name, version="0.1.0")


@app.get("/api/health")
async def health():
    """Tell us whether the app and both databases are reachable."""
    checks = {}

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as exc:
        checks["postgres"] = f"down: {type(exc).__name__}"

    try:
        await get_mongo().command("ping")
        checks["mongo"] = "ok"
    except Exception as exc:
        checks["mongo"] = f"down: {type(exc).__name__}"

    status = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status, **checks}