from datetime import UTC, datetime, timedelta
import re

import bcrypt
import jwt

from app.core.config import get_settings


def hash_password(value: str) -> str:
    """Hash passwords with bcrypt directly for broad runtime compatibility."""

    return bcrypt.hashpw(value.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""

    if not hashed_password:
        return False
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def _parse_expiration(raw: str) -> timedelta:
    match = re.fullmatch(r"(\d+)([dhm])", raw.strip().lower())
    if not match:
        return timedelta(days=7)
    amount = int(match.group(1))
    unit = match.group(2)
    if unit == "d":
        return timedelta(days=amount)
    if unit == "h":
        return timedelta(hours=amount)
    return timedelta(minutes=amount)


def create_access_token(payload: dict) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    token_payload = {
        "id": payload["id"],
        "email": payload["email"],
        "firstName": payload.get("firstName") or payload.get("first_name"),
        "lastName": payload.get("lastName") or payload.get("last_name"),
        "role": payload.get("role"),
        "iat": int(now.timestamp()),
        "exp": now + _parse_expiration(settings.jwt_expiration),
    }
    return jwt.encode(token_payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
