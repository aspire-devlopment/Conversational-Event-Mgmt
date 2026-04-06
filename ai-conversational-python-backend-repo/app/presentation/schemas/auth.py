"""Auth request and response schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)
    email: EmailStr
    phone: str = Field(min_length=1)
    password: str = Field(min_length=6)
    role: str = Field(min_length=1)


class UserViewModel(BaseModel):
    id: int
    email: str
    firstName: str
    lastName: str | None = None
    phone: str | None = None
    role: str | None = None


class AuthData(BaseModel):
    token: str
    user: UserViewModel


class ProfileData(BaseModel):
    user: UserViewModel
