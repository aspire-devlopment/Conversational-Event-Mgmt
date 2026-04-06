"""Admin-only endpoints for user management."""

from fastapi import APIRouter, Depends, Query

from app.core.exceptions import NotFoundError
from app.core.security import hash_password
from app.infrastructure.repositories.user_repository import UserRepository
from app.presentation.dependencies.auth import require_admin
from app.presentation.schemas.admin import (
    AdminUserViewModel,
    ResetPasswordData,
    ResetPasswordRequest,
    UserListData,
)
from app.presentation.schemas.common import ApiEnvelope

router = APIRouter(prefix="/api/admin", tags=["admin"])


def serialize_user(user: dict) -> dict:
    """Convert database-native values into the JSON shape exposed to the frontend."""

    serialized = {
        "id": user["id"],
        "first_name": user["first_name"],
        "last_name": user.get("last_name"),
        "email": user["email"],
        "contact_number": user.get("contact_number"),
        "role_id": user.get("role_id"),
        "role": user.get("role"),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }
    for key in ["created_at", "updated_at"]:
        if serialized.get(key):
            serialized[key] = serialized[key].isoformat()
    return serialized


@router.get("/users", response_model=ApiEnvelope[UserListData])
async def list_users(
    _: dict = Depends(require_admin),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
):
    """List users with bounded pagination for safer production reads."""

    offset = (page - 1) * page_size
    page_result = UserRepository.list_paginated(offset=offset, limit=page_size)
    sanitized = [serialize_user(user) for user in page_result["items"]]
    return {
        "status": "success",
        "message": "Users fetched successfully",
        "data": {
            "users": sanitized,
            "total": page_result["total"],
            "page": page,
            "pageSize": page_size,
        },
    }


@router.post("/users/{user_id}/reset-password", response_model=ApiEnvelope[ResetPasswordData])
async def reset_password(user_id: int, payload: ResetPasswordRequest, _: dict = Depends(require_admin)):
    user = UserRepository.get_by_id(user_id)
    if not user:
        raise NotFoundError("User not found")
    updated = UserRepository.update_password(user_id, hash_password(payload.newPassword))
    return {
        "status": "success",
        "message": "Password reset successful",
        "data": {"user": serialize_user(updated)},
    }
