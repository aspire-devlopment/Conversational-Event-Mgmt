"""Repository for persisting high-value error logs to PostgreSQL."""

from __future__ import annotations

from app.core.database import get_connection


class LogRepository:
    """Persist application error events into the shared error_logs table."""

    @staticmethod
    def create_error_log(payload: dict) -> None:
        query = """
            INSERT INTO error_logs (
                trace_id, method, path, status_code, error_message, error_stack, request_body
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                query,
                (
                    payload.get("trace_id"),
                    payload.get("method"),
                    payload.get("path"),
                    payload.get("status_code"),
                    payload.get("error_message"),
                    payload.get("error_stack"),
                    payload.get("request_body"),
                ),
            )
            connection.commit()
