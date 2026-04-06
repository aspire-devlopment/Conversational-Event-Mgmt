from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from app.core.config import get_settings


@contextmanager
def get_connection():
    settings = get_settings()
    with psycopg.connect(settings.postgres_dsn, row_factory=dict_row) as connection:
        yield connection


@contextmanager
def get_transaction():
    with get_connection() as connection:
        with connection.transaction():
            yield connection
