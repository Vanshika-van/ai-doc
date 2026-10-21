from fastapi import APIRouter, FastAPI
from sqlalchemy import text

from app.api import auth
from app.core.config import settings
from app.db.mongo import get_mongo
from app.db.postgres import engine

app = FastAPI(title=settings.app_name, version="0.1.0")

api = APIRouter(prefix="/api")
api.include_router(auth.router)


@api.get("/health")
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


app.include_router(api)