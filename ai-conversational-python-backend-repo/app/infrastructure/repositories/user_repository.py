"""User repository abstraction over PostgreSQL queries.

These repository methods intentionally stay small and SQL-focused so business
rules remain in the application service layer.
"""

from app.core.database import get_connection


class UserRepository:
    @staticmethod
    def find_by_email(email: str):
        query = """
            SELECT u.id, u.first_name, u.last_name, u.email, u.contact_number,
                   u.password_hash, u.role_id, r.name AS role, u.created_at, u.updated_at
            FROM users u
            LEFT JOIN roles r ON r.id = u.role_id
            WHERE LOWER(u.email) = LOWER(%s)
            LIMIT 1
        """
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(query, (email,))
            return cursor.fetchone()

    @staticmethod
    def get_by_id(user_id: int):
        query = """
            SELECT u.id, u.first_name, u.last_name, u.email, u.contact_number,
                   u.password_hash, u.role_id, r.name AS role, u.created_at, u.updated_at
            FROM users u
            LEFT JOIN roles r ON r.id = u.role_id
            WHERE u.id = %s
            LIMIT 1
        """
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(query, (user_id,))
            return cursor.fetchone()

    @staticmethod
    def list_paginated(offset: int = 0, limit: int = 20):
        """Return a bounded page of users plus the total row count."""

        query = """
            SELECT
                u.id, u.first_name, u.last_name, u.email, u.contact_number,
                u.role_id, r.name AS role, u.created_at, u.updated_at,
                COUNT(*) OVER() AS total_count
            FROM users u
            LEFT JOIN roles r ON r.id = u.role_id
            ORDER BY u.created_at DESC, u.id DESC
            OFFSET %s
            LIMIT %s
        """
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(query, (offset, limit))
            rows = cursor.fetchall()
            total = rows[0]["total_count"] if rows else 0
            cleaned_rows = []
            for row in rows:
                item = dict(row)
                item.pop("total_count", None)
                cleaned_rows.append(item)
            return {"items": cleaned_rows, "total": total}

    @staticmethod
    def create(payload: dict):
        query = """
            INSERT INTO users (first_name, last_name, email, contact_number, password_hash, role_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                query,
                (
                    payload["first_name"],
                    payload.get("last_name"),
                    payload["email"],
                    payload.get("contact_number"),
                    payload["password_hash"],
                    payload["role_id"],
                ),
            )
            row = cursor.fetchone()
            connection.commit()
            return UserRepository.get_by_id(row["id"]) if row else None

    @staticmethod
    def update_password(user_id: int, password_hash: str):
        """Update a password inside one transaction after locking the target user row."""

        query = """
            UPDATE users
            SET password_hash = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT id FROM users WHERE id = %s FOR UPDATE", (user_id,))
            if not cursor.fetchone():
                connection.rollback()
                return None
            cursor.execute(query, (password_hash, user_id))
            row = cursor.fetchone()
            connection.commit()
            return UserRepository.get_by_id(row["id"]) if row else None
