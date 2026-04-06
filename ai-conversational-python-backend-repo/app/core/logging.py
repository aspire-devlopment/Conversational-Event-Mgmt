"""Structured logging helpers for the FastAPI application.

This module centralizes the logging approach for the Python backend:
- structured JSON logs for machine-friendly analysis
- request trace correlation via a context variable
- redaction of sensitive fields before serialization
- date-based file storage under a dedicated logs directory
"""

from __future__ import annotations

import json
import logging
from logging import Handler
from pathlib import Path
from contextvars import ContextVar
from datetime import datetime, UTC
from typing import Any

from app.core.config import get_settings

request_id_context: ContextVar[str | None] = ContextVar("request_id", default=None)
SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "token",
    "authorization",
    "api_key",
    "access_token",
    "refresh_token",
    "secret",
    "key",
}
MAX_STRING_LENGTH = 1200


def _truncate_string(value: str) -> str:
    if len(value) <= MAX_STRING_LENGTH:
        return value
    return f"{value[:MAX_STRING_LENGTH]}... [truncated]"


def redact_sensitive(value: Any, key_hint: str | None = None) -> Any:
    """Recursively redact secrets from dictionaries, arrays, and long strings."""

    normalized_key = str(key_hint or "").strip().lower()
    if normalized_key in SENSITIVE_KEYS:
        return "[REDACTED]"

    if isinstance(value, dict):
        return {key: redact_sensitive(item, str(key)) for key, item in value.items()}
    if isinstance(value, list):
        return [redact_sensitive(item) for item in value]
    if isinstance(value, tuple):
        return [redact_sensitive(item) for item in value]
    if isinstance(value, str):
        return _truncate_string(value)
    return value


class DateFolderFileHandler(Handler):
    """Write JSON log lines into `logs/YYYY-MM-DD/<filename>`."""

    def __init__(self, filename: str, level: int = logging.NOTSET) -> None:
        super().__init__(level=level)
        self.filename = filename
        self.encoding = "utf-8"

    def emit(self, record: logging.LogRecord) -> None:
        try:
            settings = get_settings()
            today_folder = Path(settings.logs_root) / datetime.now(UTC).strftime("%Y-%m-%d")
            today_folder.mkdir(parents=True, exist_ok=True)
            target = today_folder / self.filename
            message = self.format(record)
            with target.open("a", encoding=self.encoding) as handle:
                handle.write(message + "\n")
        except Exception:  # noqa: BLE001
            self.handleError(record)


class JsonFormatter(logging.Formatter):
    """Emit compact JSON log lines so API requests are easy to trace."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = request_id_context.get()
        if request_id:
            payload["request_id"] = request_id
        extra_payload = getattr(record, "payload", None)
        if isinstance(extra_payload, dict):
            payload.update(redact_sensitive(extra_payload))
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    """Install JSON console and file handlers for the whole process."""

    root_logger = logging.getLogger()
    if getattr(root_logger, "_python_backend_configured", False):
        return

    formatter = JsonFormatter()

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    app_file_handler = DateFolderFileHandler("application.log")
    app_file_handler.setFormatter(formatter)

    error_file_handler = DateFolderFileHandler("error.log", level=logging.ERROR)
    error_file_handler.setFormatter(formatter)

    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
    root_logger.addHandler(app_file_handler)
    root_logger.addHandler(error_file_handler)
    root_logger.setLevel(logging.INFO)
    root_logger._python_backend_configured = True  # type: ignore[attr-defined]


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)


def with_payload(logger: logging.Logger, level: int, message: str, **payload: Any) -> None:
    """Attach structured context without polluting log message strings."""

    logger.log(level, message, extra={"payload": payload})
