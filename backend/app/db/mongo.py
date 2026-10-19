from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

# Short timeout, so a missing MongoDB fails fast instead of hanging
_client = AsyncIOMotorClient(settings.mongo_url, serverSelectionTimeoutMS=2000)


def get_mongo():
    return _client[settings.mongo_db]