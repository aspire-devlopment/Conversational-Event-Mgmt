"""Authentication endpoints exposed to the React frontend."""

from fastapi import APIRouter, Depends, status

from app.application.services.auth_service import AuthService
from app.core.exceptions import ConflictError, UnauthorizedError, AppError
from app.presentation.dependencies.auth import get_current_user
from app.presentation.schemas.auth import AuthData, LoginRequest, ProfileData, RegisterRequest
from app.presentation.schemas.common import ApiEnvelope, EmptyData

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=ApiEnvelope[AuthData])
async def login(payload: LoginRequest):
    try:
        data = AuthService.login(payload.email, payload.password)
    except ValueError as exc:
        raise UnauthorizedError(str(exc)) from exc
    return {"status": "success", "message": "Login successful", "data": data}


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=ApiEnvelope[AuthData])
async def register(payload: RegisterRequest):
    try:
        data = AuthService.register(payload.model_dump())
    except FileExistsError as exc:
        raise ConflictError(str(exc)) from exc
    except ValueError as exc:
        raise AppError(str(exc), status.HTTP_400_BAD_REQUEST) from exc
    return {"status": "success", "message": "Register successful", "data": data}


@router.post("/logout", response_model=ApiEnvelope[EmptyData])
async def logout(_: dict = Depends(get_current_user)):
    return {"status": "success", "message": "Logout successful", "data": {}}


@router.get("/me", response_model=ApiEnvelope[ProfileData])
async def me(user: dict = Depends(get_current_user)):
    return {"status": "success", "message": "Profile fetched successfully", "data": {"user": user}}
