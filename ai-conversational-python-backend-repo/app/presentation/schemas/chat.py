"""Chat request and response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class DraftViewModel(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    subheading: str | None = None
    description: str | None = None
    bannerUrl: str | None = None
    timezone: str | None = None
    status: str | None = None
    startTime: str | None = None
    endTime: str | None = None
    vanishTime: str | None = None
    roles: list[str] = []
    language: str | None = None


class SuggestionViewModel(BaseModel):
    label: str
    value: str


class ValidationViewModel(BaseModel):
    valid: bool
    missingFields: list[str]
    errors: list[str]


class CreateSessionRequest(BaseModel):
    userId: int
    language: str = "en"
    eventId: int | None = None


class ChatMessageRequest(BaseModel):
    userId: int
    sessionId: str
    message: str = Field(min_length=1)
    language: str = "en"
    languageLocked: bool = False


class CreateSessionData(BaseModel):
    success: bool = True
    sessionId: str
    greeting: str
    language: str
    nextStep: str
    eventDraft: DraftViewModel
    mode: str
    eventId: int | None = None
    suggestions: list[SuggestionViewModel]
    summary: str
    fieldInfo: dict


class SessionDetailData(BaseModel):
    sessionId: str
    userId: int
    language: str
    conversationHistory: list[dict]
    eventDraft: DraftViewModel
    currentStep: str
    state: str
    mode: str
    eventId: int | None = None
    suggestions: list[SuggestionViewModel]
    summary: str
    fieldInfo: dict


class SessionResponse(BaseModel):
    success: bool = True
    data: SessionDetailData


class ChatMessageResponse(BaseModel):
    reply: str
    sessionId: str
    language: str
    intent: str
    confidence: float
    nextStep: str
    eventCreated: bool
    eventUpdated: bool
    createdEventId: int | None = None
    updatedEventId: int | None = None
    eventDraft: DraftViewModel | None = None
    suggestions: list[SuggestionViewModel]
    summary: str
    validation: ValidationViewModel
    fieldInfo: dict
