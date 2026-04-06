"""Baseline marker for the existing PostgreSQL schema.

Use this revision to align Alembic with a database that was already created
from `backend/Database.sql`. It intentionally does not create tables.

Recommended first-time command on an existing DB:

    alembic stamp 0001_baseline_existing_schema
"""

from __future__ import annotations


revision = "0001_baseline_existing_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
