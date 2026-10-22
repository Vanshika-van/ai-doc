"""Chat history in MongoDB.

Two collections:
  conversations: {user_id, title, created_at, updated_at}
  messages:      {conversation_id, role, content, sources, created_at}
A message can carry extra fields (sources now; token counts or ratings later) without changing any table.
That flexibility is why chat lives in MongoDB while users and documents live in Postgres.
"""
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongo import get_mongo


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utc(value: datetime) -> datetime:
    """MongoDB gives back naive datetimes; mark them UTC so the browser reads them correctly."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _oid(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None  # a made-up id like "abc" simply means "not found"


def conversation_out(doc: dict) -> dict:
    return {"id": str(doc["_id"]), "title": doc["title"], "updated_at": _utc(doc["updated_at"])}


def message_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "role": doc["role"],
        "content": doc["content"],
        "sources": doc.get("sources", []),
        "created_at": _utc(doc["created_at"]),
    }


async def create_conversation(user_id: int, title: str) -> dict:
    now = _now()
    doc = {"user_id": user_id, "title": title, "created_at": now, "updated_at": now}
    result = await get_mongo().conversations.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def get_conversation(user_id: int, conversation_id: str) -> dict | None:
    """Only returns the conversation if it belongs to this user."""
    oid = _oid(conversation_id)
    if oid is None:
        return None
    return await get_mongo().conversations.find_one({"_id": oid, "user_id": user_id})


async def list_conversations(user_id: int) -> list[dict]:
    cursor = get_mongo().conversations.find({"user_id": user_id}).sort("updated_at", -1).limit(50)
    return [doc async for doc in cursor]


async def delete_conversation(user_id: int, conversation_id: str) -> bool:
    conversation = await get_conversation(user_id, conversation_id)
    if conversation is None:
        return False
    db = get_mongo()
    await db.messages.delete_many({"conversation_id": conversation["_id"]})
    await db.conversations.delete_one({"_id": conversation["_id"]})
    return True


async def add_message(conversation_id: ObjectId, role: str, content: str, sources: list[dict] | None = None) -> dict:
    db = get_mongo()
    doc = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "sources": sources or [],
        "created_at": _now(),
    }
    result = await db.messages.insert_one(doc)
    doc["_id"] = result.inserted_id
    await db.conversations.update_one({"_id": conversation_id}, {"$set": {"updated_at": _now()}})
    return doc


async def get_messages(conversation_id: ObjectId) -> list[dict]:
    # Sort by _id, not created_at: MongoDB times only have millisecond precision, so two messages sent
    # at nearly the same moment can tie. An ObjectId always increases, so the order is always right.
    cursor = get_mongo().messages.find({"conversation_id": conversation_id}).sort("_id", 1)
    return [doc async for doc in cursor]


async def recent_history(conversation_id: ObjectId, limit: int = 6) -> list[dict]:
    """The last few messages, oldest first. Claude uses them to understand follow-up questions."""
    cursor = get_mongo().messages.find({"conversation_id": conversation_id}).sort("_id", -1).limit(limit)
    return list(reversed([doc async for doc in cursor]))