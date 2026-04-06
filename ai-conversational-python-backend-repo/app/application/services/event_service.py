"""Event application service for visibility and access decisions."""

from app.infrastructure.repositories.event_repository import EventRepository


class EventService:
    @staticmethod
    def _normalize_role_name(value: str | None) -> str:
        return str(value or "").strip().lower()

    @staticmethod
    def _can_access(event: dict, user: dict) -> bool:
        """Apply the same visibility rule used by the legacy backend."""

        user_role = EventService._normalize_role_name(user.get("role"))
        if user_role == "admin":
            return True
        if event.get("created_by") and int(event["created_by"]) == int(user["id"]):
            return True
        return any(EventService._normalize_role_name(role) == user_role for role in (event.get("roles") or []))

    @staticmethod
    def list_events(user: dict):
        """Return only the events visible to the authenticated user."""

        return [event for event in EventRepository.list_paginated(0, 10000)["items"] if EventService._can_access(event, user)]

    @staticmethod
    def list_events_paginated(user: dict, page: int = 1, page_size: int = 20):
        """Paginate after applying visibility rules.

        For now we filter in the application layer because event visibility is
        role-aware and shared with the legacy backend behavior.
        """

        page = max(page, 1)
        page_size = max(1, min(page_size, 100))
        visible_events = EventService.list_events(user)
        start = (page - 1) * page_size
        end = start + page_size
        return {
            "items": visible_events[start:end],
            "total": len(visible_events),
            "page": page,
            "page_size": page_size,
        }

    @staticmethod
    def get_event(event_id: int, user: dict):
        """Return a single visible event or surface an authorization error."""

        event = EventRepository.get_by_id(event_id)
        if not event:
            return None
        if not EventService._can_access(event, user):
            raise PermissionError("You cannot view this event")
        return event
