"""add embedding to chunks

Revision ID: 398c99b7c321
Revises: a3a1d97c3f39
Create Date: 2026-10-22 06:37:13.941275

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = '398c99b7c321'
down_revision: Union[str, Sequence[str], None] = 'a3a1d97c3f39'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")  # turn on pgvector in this database
    op.execute("DELETE FROM documents")  # old chunks have no embedding; their documents must be re-uploaded
    op.add_column('chunks', sa.Column('embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1024), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('chunks', 'embedding')