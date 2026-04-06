"""Chat endpoints used by the conversational event creation UI."""

from fastapi import APIRouter, Depends, status

from app.application.services.chat_service import ChatService
from app.core.exceptions import ForbiddenError, NotFoundError
from app.presentation.dependencies.auth import get_current_user
from app.presentation.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    CreateSessionData,
    CreateSessionRequest,
    SessionResponse,
)
from app.presentation.schemas.common import ApiEnvelope, EmptyData

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/session", status_code=status.HTTP_201_CREATED, response_model=CreateSessionData)
async def create_session(payload: CreateSessionRequest, user: dict = Depends(get_current_user)):
    try:
        return await ChatService.create_session(user, payload.language, payload.eventId)
    except LookupError as exc:
        raise NotFoundError(str(exc)) from exc


@router.get("/session/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    try:
        return await ChatService.get_session(session_id, user)
    except LookupError as exc:
        raise NotFoundError(str(exc)) from exc
    except PermissionError as exc:
        raise ForbiddenError(str(exc)) from exc


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(payload: ChatMessageRequest, user: dict = Depends(get_current_user)):
    try:
        return await ChatService.send_message(
            user,
            payload.sessionId,
            payload.message,
            payload.language,
            payload.languageLocked,
        )
    except LookupError as exc:
        raise NotFoundError(str(exc)) from exc
    except PermissionError as exc:
        raise ForbiddenError(str(exc)) from exc


@router.delete("/session/{session_id}", response_model=ApiEnvelope[EmptyData])
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    try:
        result = await ChatService.delete_session(session_id, user)
        return {"status": "success", "message": result["message"], "data": {}}
    except LookupError as exc:
        raise NotFoundError(str(exc)) from exc
    except PermissionError as exc:
        raise ForbiddenError(str(exc)) from exc
