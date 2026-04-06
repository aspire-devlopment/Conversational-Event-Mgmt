"""Shared response models so routes return a consistent API shape."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ApiEnvelope(BaseModel, Generic[T]):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    status: str = "success"
    message: str | None = None
    data: T | None = None


class EmptyData(BaseModel):
    pass


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str


class HealthResponse(BaseModel):
    status: str
