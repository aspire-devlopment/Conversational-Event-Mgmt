"""JWT authentication middleware.

This middleware is responsible for reading the bearer token once per request,
decoding it, loading the current user, and storing the result on `request.state`.
Route dependencies can then enforce authentication and authorization without
repeating token parsing logic in every endpoint.
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.logging import get_logger, with_payload
from app.core.security import decode_access_token
from app.infrastructure.repositories.user_repository import UserRepository


class AuthContextMiddleware(BaseHTTPMiddleware):
    """Attach the authenticated user to request state when a bearer token exists."""

    def __init__(self, app) -> None:
        super().__init__(app)
        self.logger = get_logger("app.auth")

    async def dispatch(self, request: Request, call_next):
        request.state.user = None
        request.state.auth_error = None

        authorization = request.headers.get("Authorization", "")
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "", 1)
            try:
                payload = decode_access_token(token)
                user = UserRepository.get_by_id(int(payload["id"]))
                if user:
                    request.state.user = {
                        "id": user["id"],
                        "email": user["email"],
                        "firstName": user["first_name"],
                        "lastName": user.get("last_name"),
                        "phone": user.get("contact_number"),
                        "role": user.get("role"),
                    }
                else:
                    request.state.auth_error = "Unauthorized"
            except Exception as exc:  # noqa: BLE001
                request.state.auth_error = str(exc)
                with_payload(
                    self.logger,
                    30,
                    "Failed to build auth context",
                    path=request.url.path,
                    trace_id=getattr(request.state, "trace_id", None),
                    error=str(exc),
                )

        return await call_next(request)
