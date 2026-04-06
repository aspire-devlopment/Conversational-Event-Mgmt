"""Event request and response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class EventPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    subheading: str | None = None
    description: str | None = None
    banner_url: str | None = None
    bannerUrl: str | None = None
    timezone: str | None = None
    status: str | None = None
    start_time: str | None = None
    startTime: str | None = None
    end_time: str | None = None
    endTime: str | None = None
    vanish_time: str | None = None
    vanishTime: str | None = None
    language: str | None = None
    roles: list[str] | None = None
    created_by: int | None = None


class EventViewModel(BaseModel):
    id: int
    name: str
    subheading: str | None = None
    description: str | None = None
    banner_url: str | None = None
    timezone: str
    status: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    vanish_time: str | None = None
    language: str | None = None
    created_by: int | None = None
    created_at: str | None = None
    updated_at: str | None = None
    roles: list[str] = []


class EventListData(BaseModel):
    events: list[EventViewModel]
    total: int
    page: int
    pageSize: int


class EventData(BaseModel):
    event: EventViewModel
