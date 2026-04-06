"""Authentication and authorization dependencies shared by API routes."""

from fastapi import Depends, Request

from app.core.exceptions import ForbiddenError, UnauthorizedError


def get_current_user(request: Request) -> dict:
    """Require a valid authenticated user populated by auth middleware."""

    if getattr(request.state, "auth_error", None):
        raise UnauthorizedError(request.state.auth_error)
    if not getattr(request.state, "user", None):
        raise UnauthorizedError("Unauthorized")
    return request.state.user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require the authenticated user to have the Admin role."""

    if user.get("role") != "Admin":
        raise ForbiddenError("Forbidden")
    return user
