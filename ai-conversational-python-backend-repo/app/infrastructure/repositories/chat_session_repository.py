"""Chat session repository backed by the shared PostgreSQL database."""

from datetime import datetime, timedelta
import uuid

from app.core.database import get_connection
from psycopg.types.json import Jsonb


def _expiry() -> datetime:
    return datetime.utcnow() + timedelta(hours=24)


class ChatSessionRepository:
    @staticmethod
    def cleanup_expired():
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute("DELETE FROM chat_sessions WHERE expires_at <= CURRENT_TIMESTAMP")
            connection.commit()

    @staticmethod
    def create(payload: dict):
        ChatSessionRepository.cleanup_expired()
        session_id = str(uuid.uuid4())
        expires_at = _expiry()
        session_data = {
            "id": session_id,
            "user_id": payload["user_id"],
            "conversation_history": payload.get("conversation_history", []),
            "event_draft": payload["event_draft"],
            "current_step": payload["current_step"],
            "language": payload["language"],
            "state": payload.get("state", "collecting"),
            "mode": payload.get("mode", "create"),
            "event_id": payload.get("event_id"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO chat_sessions (id, user_id, session_data, current_step, language, expires_at)
                VALUES (%s, %s, %s::jsonb, %s, %s, %s)
                RETURNING id, user_id, session_data, current_step, language, expires_at, created_at, updated_at
                """,
                (session_id, payload["user_id"], Jsonb(session_data), payload["current_step"], payload["language"], expires_at),
            )
            row = cursor.fetchone()
            connection.commit()
            return row

    @staticmethod
    def get_by_id(session_id: str):
        ChatSessionRepository.cleanup_expired()
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, user_id, session_data, current_step, language, expires_at, created_at, updated_at
                FROM chat_sessions
                WHERE id = %s AND expires_at > CURRENT_TIMESTAMP
                """,
                (session_id,),
            )
            return cursor.fetchone()

    @staticmethod
    def update(session_id: str, payload: dict):
        next_session_data = payload.get("session_data")
        if next_session_data is not None:
            next_session_data["updated_at"] = datetime.utcnow().isoformat()
        expires_at = payload.get("expires_at") or _expiry()
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE chat_sessions
                SET session_data = COALESCE(%s::jsonb, session_data),
                    current_step = COALESCE(%s, current_step),
                    language = COALESCE(%s, language),
                    expires_at = COALESCE(%s, expires_at),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, user_id, session_data, current_step, language, expires_at, created_at, updated_at
                """,
                (Jsonb(next_session_data) if next_session_data is not None else None, payload.get("current_step"), payload.get("language"), expires_at, session_id),
            )
            row = cursor.fetchone()
            connection.commit()
            return row

    @staticmethod
    def add_message(session_id: str, role: str, content: str):
        session = ChatSessionRepository.get_by_id(session_id)
        if not session:
            return None
        session_data = session["session_data"]
        # Store the raw conversation history in JSONB so the chat flow survives refreshes.
        history = session_data.get("conversation_history", [])
        history.append({"role": role, "content": content, "timestamp": datetime.utcnow().isoformat()})
        session_data["conversation_history"] = history
        return ChatSessionRepository.update(session_id, {"session_data": session_data})

    @staticmethod
    def delete(session_id: str) -> bool:
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute("DELETE FROM chat_sessions WHERE id = %s", (session_id,))
            deleted = cursor.rowcount > 0
            connection.commit()
            return deleted
