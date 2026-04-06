"""Admin request and response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AdminUserViewModel(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    email: str
    contact_number: str | None = None
    role_id: int | None = None
    role: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class UserListData(BaseModel):
    users: list[AdminUserViewModel]
    total: int
    page: int
    pageSize: int


class ResetPasswordRequest(BaseModel):
    newPassword: str = Field(min_length=6)


class ResetPasswordData(BaseModel):
    user: AdminUserViewModel
