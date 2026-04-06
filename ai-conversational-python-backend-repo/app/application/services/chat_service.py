from __future__ import annotations

from app.application.services.llm_service import LlmService
from app.domain.chat_utils import (
    build_field_info,
    build_summary,
    create_empty_draft,
    detect_language,
    get_next_step,
    get_suggestions,
    merge_draft,
    normalize_draft,
    normalize_language,
    try_parse_user_provided_draft,
    validate_event_data,
)
from app.infrastructure.repositories.chat_session_repository import ChatSessionRepository
from app.infrastructure.repositories.event_repository import EventRepository


def _map_event_to_draft(event: dict) -> dict:
    return {
        "name": event.get("name"),
        "subheading": event.get("subheading"),
        "description": event.get("description"),
        "bannerUrl": event.get("banner_url"),
        "timezone": event.get("timezone"),
        "status": event.get("status"),
        "startTime": event.get("start_time").strftime("%Y-%m-%d %H:%M") if event.get("start_time") else None,
        "endTime": event.get("end_time").strftime("%Y-%m-%d %H:%M") if event.get("end_time") else None,
        "vanishTime": event.get("vanish_time").strftime("%Y-%m-%d %H:%M") if event.get("vanish_time") else None,
        "roles": event.get("roles") or [],
        "language": event.get("language") or "en",
    }


def _normalize_event_payload(draft: dict, user_id: int) -> dict:
    return {
        "name": draft.get("name"),
        "subheading": draft.get("subheading"),
        "description": draft.get("description"),
        "banner_url": draft.get("bannerUrl"),
        "timezone": draft.get("timezone"),
        "status": draft.get("status"),
        "start_time": draft.get("startTime"),
        "end_time": draft.get("endTime"),
        "vanish_time": draft.get("vanishTime"),
        "language": draft.get("language") or "en",
        "created_by": user_id,
    }


def _is_confirmation_message(message: str) -> bool:
    sample = str(message or "").strip().lower()
    return sample in {"yes", "confirm", "create event", "create", "go ahead", "publish it", "save it", "save now"}


class ChatService:
    @staticmethod
    async def create_session(user: dict, language: str = "en", event_id: int | None = None):
        normalized_language = normalize_language(language)
        event_draft = create_empty_draft(normalized_language)
        mode = "create"
        if event_id:
            event = EventRepository.get_by_id(event_id)
            if not event:
                raise LookupError("Event not found")
            event_draft = normalize_draft(_map_event_to_draft(event), event.get("language") or normalized_language)
            mode = "update"
        next_step = get_next_step(event_draft)
        session = ChatSessionRepository.create(
            {
                "user_id": user["id"],
                "language": normalized_language,
                "conversation_history": [],
                "event_draft": event_draft,
                "current_step": next_step,
                "state": "collecting",
                "mode": mode,
                "event_id": event_id,
            }
        )
        greeting = (
            f"You're editing \"{event_draft.get('name')}\". Tell me what you'd like to change."
            if mode == "update"
            else "Welcome. I can help you create a virtual event. What would you like to name the event?"
        )
        ChatSessionRepository.add_message(session["id"], "bot", greeting)
        suggestions = [{"label": item, "value": item} for item in get_suggestions(next_step, normalized_language)[:3]]
        return {
            "success": True,
            "sessionId": str(session["id"]),
            "greeting": greeting,
            "language": normalized_language,
            "nextStep": next_step,
            "eventDraft": event_draft,
            "mode": mode,
            "eventId": event_id,
            "suggestions": suggestions,
            "summary": build_summary(event_draft),
            "fieldInfo": build_field_info(),
        }

    @staticmethod
    async def get_session(session_id: str, user: dict):
        session = ChatSessionRepository.get_by_id(session_id)
        if not session:
            raise LookupError("Session not found")
        if int(session["user_id"]) != int(user["id"]):
            raise PermissionError("You cannot access this session")
        session_data = session["session_data"]
        event_draft = normalize_draft(session_data.get("event_draft"), session.get("language"))
        next_step = get_next_step(event_draft)
        return {
            "success": True,
            "data": {
                "sessionId": str(session["id"]),
                "userId": session["user_id"],
                "language": session["language"],
                "conversationHistory": session_data.get("conversation_history", []),
                "eventDraft": event_draft,
                "currentStep": next_step,
                "state": session_data.get("state", "collecting"),
                "mode": session_data.get("mode", "create"),
                "eventId": session_data.get("event_id"),
                "suggestions": [{"label": item, "value": item} for item in get_suggestions(next_step, session["language"])[:3]],
                "summary": build_summary(event_draft),
                "fieldInfo": build_field_info(),
            },
        }

    @staticmethod
    async def delete_session(session_id: str, user: dict):
        session = ChatSessionRepository.get_by_id(session_id)
        if not session:
            raise LookupError("Session not found")
        if int(session["user_id"]) != int(user["id"]):
            raise PermissionError("You cannot access this session")
        ChatSessionRepository.delete(session_id)
        return {"success": True, "message": "Session deleted"}

    @staticmethod
    async def _process_message(user_message: str, conversation_history: list[dict], current_event_data: dict, language: str, language_locked: bool):
        effective_language = normalize_language(language if language_locked else detect_language(user_message, current_event_data.get("language") or language))
        draft = normalize_draft(current_event_data, effective_language)
        direct_json = try_parse_user_provided_draft(user_message, effective_language)
        if direct_json:
            merged_draft = merge_draft(draft, direct_json["draft"], effective_language)
            next_step = get_next_step(merged_draft)
            validation = validate_event_data(merged_draft)
            message = (
                f"I parsed the JSON details and filled the event draft.\n\n{build_summary(merged_draft)}\n\nPlease confirm if everything looks correct."
                if validation["valid"]
                else f"I parsed the JSON details and filled the event draft.\n\n{build_summary(merged_draft)}\n\nNext, I still need: {next_step}."
            )
            return {
                "intent": "confirm" if validation["valid"] else "collect",
                "language": effective_language,
                "extractedData": merged_draft,
                "changedFields": direct_json["changedFields"],
                "nextStep": next_step,
                "message": message,
                "confidence": 1.0,
                "suggestions": get_suggestions(next_step, effective_language),
                "summary": build_summary(merged_draft),
            }

        system_prompt = (
            "You are an AI assistant that creates virtual events entirely through chat.\n"
            f"Respond in {'German' if effective_language == 'de' else 'French' if effective_language == 'fr' else 'English'}.\n"
            "Return JSON only. Do not include markdown fences or explanatory text.\n"
            "Schema keys: intent, language, extractedData, changedFields, nextStep, message, confidence.\n"
            "extractedData keys: name, subheading, description, bannerUrl, timezone, status, startTime, endTime, vanishTime, roles.\n"
        )
        history_messages = [
            {"role": "assistant" if item["role"] == "bot" else "user", "content": item["content"]}
            for item in conversation_history[-14:]
            if item["role"] in {"bot", "user"}
        ]
        context_message = (
            f"Current event data:\n{build_summary(draft)}\n\n"
            f"Supported timezones: {', '.join(['UTC', 'Asia/Katmandu', 'Europe/London', 'America/New_York'])}\n"
            "Supported statuses: Draft, Published, Pending\n"
            "Supported roles: Admin, Manager, Sales Rep, Viewer\n\n"
            f"Latest user message: \"{user_message}\""
        )
        response = await LlmService.call_structured_json(
            [{"role": "system", "content": system_prompt}, *history_messages, {"role": "user", "content": context_message}],
            max_tokens=700,
        )
        response_language = effective_language if language_locked else normalize_language(response.get("language") or effective_language)
        merged_draft = merge_draft(draft, response.get("extractedData") or {}, response_language)
        next_step = response.get("nextStep") or get_next_step(merged_draft)
        return {
            "intent": response.get("intent") or "collect",
            "language": response_language,
            "extractedData": merged_draft,
            "changedFields": response.get("changedFields") or [],
            "nextStep": next_step,
            "message": response.get("message") or "Could you clarify that?",
            "confidence": response.get("confidence", 0.5),
            "suggestions": get_suggestions(next_step, response_language),
            "summary": build_summary(merged_draft),
        }

    @staticmethod
    async def send_message(user: dict, session_id: str, message: str, language: str, language_locked: bool = False):
        session = ChatSessionRepository.get_by_id(session_id)
        if not session:
            raise LookupError("Session not found")
        if int(session["user_id"]) != int(user["id"]):
            raise PermissionError("You cannot access this session")
        ChatSessionRepository.add_message(session_id, "user", message)
        refreshed = ChatSessionRepository.get_by_id(session_id)
        session_data = refreshed["session_data"]
        llm_response = await ChatService._process_message(
            message,
            session_data.get("conversation_history", []),
            session_data.get("event_draft", {}),
            language,
            language_locked,
        )
        event_draft = normalize_draft(llm_response["extractedData"], llm_response["language"])
        session_data["event_draft"] = event_draft
        session_data["current_step"] = llm_response["nextStep"]
        session_data["state"] = "confirming" if llm_response["intent"] == "confirm" else "collecting"
        ChatSessionRepository.update(
            session_id,
            {"session_data": session_data, "current_step": llm_response["nextStep"], "language": llm_response["language"]},
        )
        validation = validate_event_data(event_draft)

        event_created = False
        event_updated = False
        created_event_id = None
        updated_event_id = None
        reply = llm_response["message"]
        explicit_confirmation = _is_confirmation_message(message)

        if validation["valid"] and not explicit_confirmation:
            # Keep the conversation in a review state until the user clearly confirms saving.
            llm_response["intent"] = "confirm"
            llm_response["nextStep"] = "confirm"
            llm_response["suggestions"] = get_suggestions("confirm", llm_response["language"])
            session_data["current_step"] = "confirm"
            session_data["state"] = "confirming"
            ChatSessionRepository.update(
                session_id,
                {"session_data": session_data, "current_step": "confirm", "language": llm_response["language"]},
            )
            reply = (
                "I have all the event details ready.\n\n"
                f"{build_summary(event_draft)}\n\n"
                "Please confirm if you want me to create the event."
            )
            ChatSessionRepository.add_message(session_id, "bot", reply)
            return {
                "reply": reply,
                "sessionId": session_id,
                "language": llm_response["language"],
                "intent": "confirm",
                "confidence": llm_response["confidence"],
                "nextStep": "confirm",
                "eventCreated": False,
                "eventUpdated": False,
                "createdEventId": None,
                "updatedEventId": None,
                "eventDraft": event_draft,
                "suggestions": [{"label": item, "value": item} for item in get_suggestions("confirm", llm_response["language"])[:3]],
                "summary": build_summary(event_draft),
                "validation": validation,
                "fieldInfo": build_field_info(),
            }

        if explicit_confirmation and validation["valid"]:
            payload = _normalize_event_payload(event_draft, user["id"])
            if session_data.get("mode") == "update" and session_data.get("event_id"):
                updated_event = EventRepository.update_with_roles(session_data["event_id"], payload, event_draft.get("roles"))
                if updated_event:
                    event_updated = True
                    updated_event_id = updated_event["id"]
                    reply = "The event was updated successfully."
            else:
                created_event = EventRepository.create_with_roles(payload, event_draft.get("roles") or [])
                if created_event:
                    event_created = True
                    created_event_id = created_event["id"]
                    reply = "The event was created successfully."
            if event_created or event_updated:
                ChatSessionRepository.delete(session_id)
        elif explicit_confirmation and not validation["valid"]:
            missing = ", ".join(validation["missingFields"]) or "none"
            errors = ", ".join(validation["errors"]) or "none"
            reply = f"We still need a few details before creating the event. Missing fields: {missing}. Errors: {errors}."
            ChatSessionRepository.add_message(session_id, "bot", reply)
        else:
            ChatSessionRepository.add_message(session_id, "bot", reply)

        return {
            "reply": reply,
            "sessionId": session_id,
            "language": llm_response["language"],
            "intent": llm_response["intent"],
            "confidence": llm_response["confidence"],
            "nextStep": llm_response["nextStep"],
            "eventCreated": event_created,
            "eventUpdated": event_updated,
            "createdEventId": created_event_id,
            "updatedEventId": updated_event_id,
            "eventDraft": None if event_created else event_draft,
            "suggestions": [{"label": item, "value": item} for item in llm_response["suggestions"][:3]],
            "summary": llm_response["summary"],
            "validation": validation,
            "fieldInfo": build_field_info(),
        }
