"""Alembic environment for schema migrations.

This project currently uses the existing PostgreSQL schema from the Node backend.
For an already-initialized database, stamp the baseline revision first:

    alembic stamp 0001_baseline_existing_schema

Then create forward-only migrations for future changes.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import get_settings

config = context.config
settings = get_settings()
config.set_main_option(
    "sqlalchemy.url",
    f"postgresql+psycopg://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}",
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(config.get_main_option("sqlalchemy.url"), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
