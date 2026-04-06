from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
import json
import re
from typing import Any

import dateparser

from app.domain.constants import COMMON_TIMEZONES, EVENT_FIELD_INFO, ROLES, STATUSES

SUPPORTED_LANGUAGES = ["en", "de", "fr"]
LANGUAGE_MARKERS = {
    "de": [" hallo ", " danke ", " veranstaltung ", " zeitzone ", " morgen ", " veroffentlichen "],
    "fr": [" bonjour ", " merci ", " evenement ", " fuseau ", " demain ", " publier "],
}


def normalize_text(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"\s+", " ", text)
    return f" {text.strip()} "


def normalize_language(value: str | None) -> str:
    raw = str(value or "").lower()
    if raw.startswith("de"):
        return "de"
    if raw.startswith("fr"):
        return "fr"
    return "en"


def detect_language(text: str, fallback: str = "en") -> str:
    sample = normalize_text(text)
    scored = []
    for language, markers in LANGUAGE_MARKERS.items():
        score = sum(1 for marker in markers if marker in sample)
        scored.append((language, score))
    scored.sort(key=lambda item: item[1], reverse=True)
    if scored and scored[0][1] > 0 and (len(scored) == 1 or scored[0][1] > scored[1][1]):
        return scored[0][0]
    return normalize_language(fallback)


def create_empty_draft(language: str = "en") -> dict:
    return {
        "name": None,
        "subheading": None,
        "description": None,
        "bannerUrl": None,
        "timezone": None,
        "status": None,
        "startTime": None,
        "endTime": None,
        "vanishTime": None,
        "roles": [],
        "language": normalize_language(language),
    }


def normalize_role(role: str | None) -> str | None:
    value = str(role or "").strip().lower()
    if value == "admin":
        return "Admin"
    if value == "manager":
        return "Manager"
    if value in {"sales rep", "sales representative", "sales"}:
        return "Sales Rep"
    if value == "viewer":
        return "Viewer"
    return None


def parse_role_list(input_value: Any) -> list[str]:
    if isinstance(input_value, list):
        values = input_value
    else:
        values = re.split(r",|and|und|et|/", str(input_value or ""))
    normalized = []
    for item in values:
        role = normalize_role(item)
        if role and role not in normalized:
            normalized.append(role)
    return normalized


def normalize_status(status: str | None) -> str | None:
    value = str(status or "").strip().lower()
    for item in STATUSES:
        if item.lower() == value:
            return item
    return None


def normalize_timezone(timezone: str | None) -> str | None:
    value = str(timezone or "").strip()
    if not value:
        return None
    for item in COMMON_TIMEZONES:
        if item.lower() == value.lower():
            return item
    aliases = {
        "utc": "UTC",
        "gmt": "UTC",
        "est": "America/New_York",
        "edt": "America/New_York",
        "pst": "America/Los_Angeles",
        "pdt": "America/Los_Angeles",
        "ist": "Asia/Kolkata",
        "npt": "Asia/Katmandu",
        "nepal": "Asia/Katmandu",
        "uk": "Europe/London",
    }
    return aliases.get(value.lower(), value)


def format_datetime(value: datetime) -> str:
    return value.strftime("%Y-%m-%d %H:%M")


def parse_datetime(value: Any, base: datetime | None = None) -> str | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return format_datetime(value)
    raw = str(value).strip()
    if not raw:
        return None
    parsed = dateparser.parse(
        raw,
        settings={
            "RELATIVE_BASE": base or datetime.now(),
            "PREFER_DATES_FROM": "future",
            "RETURN_AS_TIMEZONE_AWARE": False,
        },
    )
    return format_datetime(parsed) if parsed else raw


def add_hours(value: str | None, hours: int) -> str | None:
    if not value:
        return None
    parsed = datetime.strptime(value, "%Y-%m-%d %H:%M")
    return format_datetime(parsed + timedelta(hours=hours))


def add_days(value: str | None, days: int) -> str | None:
    if not value:
        return None
    parsed = datetime.strptime(value, "%Y-%m-%d %H:%M")
    return format_datetime(parsed + timedelta(days=days))


def normalize_draft(raw_draft: dict | None = None, language: str = "en") -> dict:
    raw_draft = raw_draft or {}
    draft = create_empty_draft(language)
    draft.update(raw_draft)
    draft["bannerUrl"] = raw_draft.get("bannerUrl") or raw_draft.get("banner_url")
    draft["timezone"] = normalize_timezone(raw_draft.get("timezone"))
    draft["status"] = normalize_status(raw_draft.get("status"))
    draft["startTime"] = parse_datetime(raw_draft.get("startTime"))
    draft["endTime"] = parse_datetime(raw_draft.get("endTime"))
    draft["vanishTime"] = parse_datetime(raw_draft.get("vanishTime"))
    draft["roles"] = parse_role_list(raw_draft.get("roles"))
    draft["language"] = normalize_language(raw_draft.get("language") or language)
    return draft


def merge_draft(current_draft: dict, extracted_data: dict | None, language: str) -> dict:
    current = normalize_draft(current_draft, language)
    merged = deepcopy(current)
    merged.update(extracted_data or {})
    merged["timezone"] = normalize_timezone(merged.get("timezone"))
    merged["status"] = normalize_status(merged.get("status"))
    merged["startTime"] = parse_datetime(merged.get("startTime"))
    merged["endTime"] = parse_datetime(merged.get("endTime"))
    merged["vanishTime"] = parse_datetime(merged.get("vanishTime"))
    merged["roles"] = parse_role_list(merged.get("roles"))
    merged["language"] = normalize_language(language or merged.get("language"))
    end_text = normalize_text(extracted_data.get("endTime") if extracted_data else "")
    vanish_text = normalize_text(extracted_data.get("vanishTime") if extracted_data else "")
    if merged.get("startTime") and not merged.get("endTime"):
        merged["endTime"] = add_hours(merged["startTime"], 1)
    if merged.get("endTime") and not merged.get("vanishTime"):
        merged["vanishTime"] = add_hours(merged["endTime"], 24)
    if merged.get("startTime") and "same day" in end_text:
        merged["endTime"] = add_hours(merged["startTime"], 1)
    if merged.get("endTime") and "one day after end" in vanish_text:
        merged["vanishTime"] = add_days(merged["endTime"], 1)
    if merged.get("endTime") and "one week after end" in vanish_text:
        merged["vanishTime"] = add_days(merged["endTime"], 7)
    return merged


def get_missing_fields(draft: dict) -> list[str]:
    ordered = ["name", "subheading", "description", "bannerUrl", "timezone", "status", "startTime", "endTime", "vanishTime", "roles"]
    missing = []
    for field in ordered:
        value = draft.get(field)
        if field == "roles":
            if not value:
                missing.append(field)
        elif not value:
            missing.append(field)
    return missing


def get_next_step(draft: dict) -> str:
    missing = get_missing_fields(draft)
    return missing[0] if missing else "confirm"


def build_summary(draft: dict) -> str:
    return "\n".join(
        [
            f"Event Name: {draft.get('name') or 'not set'}",
            f"Subheading: {draft.get('subheading') or 'not set'}",
            f"Description: {draft.get('description') or 'not set'}",
            f"Banner URL: {draft.get('bannerUrl') or 'not set'}",
            f"Time Zone: {draft.get('timezone') or 'not set'}",
            f"Status: {draft.get('status') or 'not set'}",
            f"Start: {draft.get('startTime') or 'not set'}",
            f"End: {draft.get('endTime') or 'not set'}",
            f"Vanish: {draft.get('vanishTime') or 'not set'}",
            f"Roles: {', '.join(draft.get('roles') or []) or 'not set'}",
        ]
    )


def get_suggestions(step: str, language: str = "en") -> list[str]:
    suggestions = {
        "name": ["Annual Tech Conference 2026", "Product Launch Event", "Team Building Workshop"],
        "subheading": ["Join us for an exciting experience", "Network with industry leaders", "Learn and grow together"],
        "description": ["A polished business event focused on learning, networking, and delivery."],
        "bannerUrl": ["https://example.com/banner1.jpg", "https://example.com/banner2.jpg"],
        "timezone": COMMON_TIMEZONES,
        "status": STATUSES,
        "roles": ROLES,
        "startTime": ["Tomorrow 10 AM", "Next Monday 2 PM", "In 2 days at 4 PM"],
        "endTime": ["Tomorrow 11 AM", "Same day 1 hour later"],
        "vanishTime": ["One day after end", "One week after end"],
        "confirm": ["Create event", "Change start time", "Change roles"],
    }
    return suggestions.get(step, [])


def validate_event_data(event_data: dict) -> dict:
    draft = normalize_draft(event_data, event_data.get("language"))
    missing_fields = get_missing_fields(draft)
    errors: list[str] = []
    invalid_roles = [role for role in (draft.get("roles") or []) if role not in ROLES]
    if invalid_roles:
        errors.append(f"roles contains invalid values: {', '.join(invalid_roles)}")
    try:
        start = datetime.strptime(draft["startTime"], "%Y-%m-%d %H:%M") if draft.get("startTime") else None
        end = datetime.strptime(draft["endTime"], "%Y-%m-%d %H:%M") if draft.get("endTime") else None
        vanish = datetime.strptime(draft["vanishTime"], "%Y-%m-%d %H:%M") if draft.get("vanishTime") else None
        if start and end and start >= end:
            errors.append("endTime must be after startTime")
        if end and vanish and vanish <= end:
            errors.append("vanishTime must be after endTime")
    except ValueError:
        errors.append("One or more date fields could not be parsed")
    if draft.get("bannerUrl") and not re.match(r"^https?://\S+$", draft["bannerUrl"], re.I):
        errors.append("bannerUrl must be a valid URL")
    return {"valid": not missing_fields and not errors, "missingFields": missing_fields, "errors": errors}


def build_field_info() -> dict:
    return EVENT_FIELD_INFO


def try_parse_user_provided_draft(message: str, language: str = "en") -> dict | None:
    if not isinstance(message, str) or not message.strip():
        return None
    candidates: list[str] = []
    trimmed = message.strip()
    if trimmed.startswith("{") or trimmed.startswith("["):
        candidates.append(trimmed)
    fenced_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", trimmed, re.I)
    if fenced_match:
        candidates.append(fenced_match.group(1).strip())
    object_match = re.search(r"\{[\s\S]*\}", trimmed)
    if object_match:
        candidates.append(object_match.group(0).strip())
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if not isinstance(parsed, dict):
            continue
        if not any(
            key in parsed
            for key in ["name", "subheading", "description", "bannerUrl", "banner_url", "timezone", "status", "startTime", "endTime", "vanishTime", "roles"]
        ):
            continue
        draft = normalize_draft(parsed, language)
        return {"draft": draft, "changedFields": [key for key, value in parsed.items() if value is not None]}
    return None
