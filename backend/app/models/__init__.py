# Import every model here so Alembic can see all tables through Base.metadata
from app.models.user import User  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.chunk import Chunk  # noqa: F401