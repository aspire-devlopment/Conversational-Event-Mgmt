"""Shared application exceptions and translation helpers."""

from __future__ import annotations


class AppError(Exception):
    """Base application error with an HTTP-friendly status code."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized") -> None:
        super().__init__(message, 401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden") -> None:
        super().__init__(message, 403)


class NotFoundError(AppError):
    def __init__(self, message: str = "Not found") -> None:
        super().__init__(message, 404)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict") -> None:
        super().__init__(message, 409)
