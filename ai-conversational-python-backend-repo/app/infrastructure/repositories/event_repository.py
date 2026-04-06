"""Event repository for CRUD operations and role synchronization.

The frontend still expects snake_case event fields, so the repository preserves
database-native column names and leaves presentation mapping to the route layer.
"""

from app.core.database import get_connection, get_transaction

BASE_SELECT = """
    SELECT e.id, e.name, e.subheading, e.description, e.banner_url, e.timezone, e.status,
           e.start_time, e.end_time, e.vanish_time, e.language, e.created_by, e.created_at, e.updated_at,
           COALESCE(
             ARRAY_AGG(DISTINCT r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),
             ARRAY[]::VARCHAR[]
           ) AS roles
    FROM events e
    LEFT JOIN event_roles er ON er.event_id = e.id
    LEFT JOIN roles r ON r.id = er.role_id
"""


class EventRepository:
    @staticmethod
    def list_paginated(offset: int = 0, limit: int = 20):
        """Return one page of events plus a separate total count."""

        query = f"{BASE_SELECT} GROUP BY e.id ORDER BY e.id DESC OFFSET %s LIMIT %s"
        count_query = "SELECT COUNT(*) AS total_count FROM events"
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(query, (offset, limit))
            rows = cursor.fetchall()
            cursor.execute(count_query)
            total = cursor.fetchone()["total_count"]
            return {"items": rows, "total": total}

    @staticmethod
    def get_by_id(event_id: int):
        query = f"{BASE_SELECT} WHERE e.id = %s GROUP BY e.id"
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(query, (event_id,))
            return cursor.fetchone()

    @staticmethod
    def _sync_roles(cursor, event_id: int, role_names: list[str] | None):
        if role_names is None:
            return
        # Replace the role mapping atomically so updates remain easy to reason about.
        cursor.execute("DELETE FROM event_roles WHERE event_id = %s", (event_id,))
        if not role_names:
            return
        normalized_role_names = sorted(set(role_names))
        # Keep role locking/order deterministic so concurrent updates are less likely to deadlock.
        cursor.execute("SELECT id, name FROM roles WHERE name = ANY(%s) ORDER BY id", (normalized_role_names,))
        role_rows = cursor.fetchall()
        role_map = {row["name"]: row["id"] for row in role_rows}
        for role_name in normalized_role_names:
            role_id = role_map.get(role_name)
            if role_id:
                cursor.execute(
                    """
                    INSERT INTO event_roles (event_id, role_id)
                    VALUES (%s, %s)
                    ON CONFLICT (event_id, role_id) DO NOTHING
                    """,
                    (event_id, role_id),
                )

    @staticmethod
    def create_with_roles(payload: dict, role_names: list[str]):
        """Create the event and its role links in one ACID transaction."""

        with get_transaction() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO events (
                    name, subheading, description, banner_url, timezone, status,
                    start_time, end_time, vanish_time, language, created_by
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
                """,
                (
                    payload["name"],
                    payload.get("subheading"),
                    payload.get("description"),
                    payload.get("banner_url"),
                    payload["timezone"],
                    payload.get("status") or "Draft",
                    payload["start_time"],
                    payload["end_time"],
                    payload.get("vanish_time"),
                    payload.get("language") or "en",
                    payload.get("created_by"),
                ),
            )
            row = cursor.fetchone()
            event_id = row["id"]
            EventRepository._sync_roles(cursor, event_id, role_names)
        return EventRepository.get_by_id(event_id)

    @staticmethod
    def update_with_roles(event_id: int, payload: dict, role_names: list[str] | None):
        """Update an event with row-level locking and deterministic role synchronization."""

        with get_transaction() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT id FROM events WHERE id = %s FOR UPDATE", (event_id,))
            if not cursor.fetchone():
                return None
            cursor.execute(
                """
                UPDATE events
                SET name = COALESCE(%s, name),
                    subheading = COALESCE(%s, subheading),
                    description = COALESCE(%s, description),
                    banner_url = COALESCE(%s, banner_url),
                    timezone = COALESCE(%s, timezone),
                    status = COALESCE(%s, status),
                    start_time = COALESCE(%s, start_time),
                    end_time = COALESCE(%s, end_time),
                    vanish_time = COALESCE(%s, vanish_time),
                    language = COALESCE(%s, language),
                    created_by = COALESCE(%s, created_by),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
                """,
                (
                    payload.get("name"),
                    payload.get("subheading"),
                    payload.get("description"),
                    payload.get("banner_url"),
                    payload.get("timezone"),
                    payload.get("status"),
                    payload.get("start_time"),
                    payload.get("end_time"),
                    payload.get("vanish_time"),
                    payload.get("language"),
                    payload.get("created_by"),
                    event_id,
                ),
            )
            row = cursor.fetchone()
            if not row:
                return None
            EventRepository._sync_roles(cursor, event_id, role_names)
        return EventRepository.get_by_id(event_id)

    @staticmethod
    def delete(event_id: int) -> bool:
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute("DELETE FROM events WHERE id = %s", (event_id,))
            deleted = cursor.rowcount > 0
            connection.commit()
            return deleted
