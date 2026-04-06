"""Event endpoints with response shapes aligned to the existing frontend."""

from fastapi import APIRouter, Depends, Query, status

from app.application.services.event_service import EventService
from app.core.exceptions import ForbiddenError, NotFoundError
from app.infrastructure.repositories.event_repository import EventRepository
from app.presentation.dependencies.auth import get_current_user, require_admin
from app.presentation.schemas.common import ApiEnvelope, EmptyData
from app.presentation.schemas.events import EventData, EventListData, EventPayload

router = APIRouter(prefix="/api/events", tags=["events"])


def serialize_event(event: dict) -> dict:
    serialized = dict(event)
    for key in ["start_time", "end_time", "vanish_time", "created_at", "updated_at"]:
        if serialized.get(key):
            serialized[key] = serialized[key].isoformat()
    return serialized


@router.get("", response_model=ApiEnvelope[EventListData])
async def list_events(
    user: dict = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
):
    """List visible events with optional pagination parameters."""

    page_result = EventService.list_events_paginated(user, page=page, page_size=page_size)
    events = [serialize_event(event) for event in page_result["items"]]
    return {
        "status": "success",
        "data": {
            "events": events,
            "total": page_result["total"],
            "page": page_result["page"],
            "pageSize": page_result["page_size"],
        },
    }


@router.get("/{event_id}", response_model=ApiEnvelope[EventData])
async def get_event(event_id: int, user: dict = Depends(get_current_user)):
    try:
        event = EventService.get_event(event_id, user)
    except PermissionError as exc:
        raise ForbiddenError(str(exc)) from exc
    if not event:
        raise NotFoundError("Event not found")
    return {"status": "success", "data": {"event": serialize_event(event)}}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ApiEnvelope[EventData])
async def create_event(payload: EventPayload, user: dict = Depends(require_admin)):
    event_payload = payload.model_dump(exclude_none=True)
    if "bannerUrl" in event_payload and "banner_url" not in event_payload:
        event_payload["banner_url"] = event_payload.pop("bannerUrl")
    if "startTime" in event_payload and "start_time" not in event_payload:
        event_payload["start_time"] = event_payload.pop("startTime")
    if "endTime" in event_payload and "end_time" not in event_payload:
        event_payload["end_time"] = event_payload.pop("endTime")
    if "vanishTime" in event_payload and "vanish_time" not in event_payload:
        event_payload["vanish_time"] = event_payload.pop("vanishTime")
    event = EventRepository.create_with_roles({**event_payload, "created_by": user["id"]}, event_payload.get("roles") or [])
    return {"status": "success", "message": "Event created successfully", "data": {"event": serialize_event(event)}}


@router.put("/{event_id}", response_model=ApiEnvelope[EventData])
async def update_event(event_id: int, payload: EventPayload, _: dict = Depends(require_admin)):
    event_payload = payload.model_dump(exclude_none=True)
    if "bannerUrl" in event_payload and "banner_url" not in event_payload:
        event_payload["banner_url"] = event_payload.pop("bannerUrl")
    if "startTime" in event_payload and "start_time" not in event_payload:
        event_payload["start_time"] = event_payload.pop("startTime")
    if "endTime" in event_payload and "end_time" not in event_payload:
        event_payload["end_time"] = event_payload.pop("endTime")
    if "vanishTime" in event_payload and "vanish_time" not in event_payload:
        event_payload["vanish_time"] = event_payload.pop("vanishTime")
    event = EventRepository.update_with_roles(event_id, event_payload, event_payload.get("roles"))
    if not event:
        raise NotFoundError("Event not found")
    return {"status": "success", "message": "Event updated successfully", "data": {"event": serialize_event(event)}}


@router.delete("/{event_id}", response_model=ApiEnvelope[EmptyData])
async def delete_event(event_id: int, _: dict = Depends(require_admin)):
    deleted = EventRepository.delete(event_id)
    if not deleted:
        raise NotFoundError("Event not found")
    return {"status": "success", "message": "Event deleted successfully", "data": {}}
