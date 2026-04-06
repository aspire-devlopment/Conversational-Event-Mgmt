"""Role repository for small lookup-oriented queries."""

from app.core.database import get_connection


class RoleRepository:
    @staticmethod
    def get_by_name(name: str):
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM roles WHERE name = %s LIMIT 1", (name,))
            return cursor.fetchone()
