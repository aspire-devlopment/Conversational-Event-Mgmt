# Workstructure

This document explains how the backend is organized and how the AI chat flow works from the first user message to the final database insert.

## Backend Structure

The backend is an Express application. The main entry point is `backend/server.js`. It loads environment variables, creates the Express app, attaches middleware, creates repositories, registers routes, and starts the HTTP server.

The backend is split into these layers:

- `routes/`: Defines API URLs and connects them to controllers.
- `controllers/`: Handles HTTP request/response logic.
- `services/`: Contains business logic, AI/LLM logic, validation, normalization, and helper workflows.
- `repositories/`: Contains database access code.
- `data/`: Creates repository instances and wraps PostgreSQL access through a data context.
- `middleware/`: Handles authentication, validation, logging, security, errors, and idempotency.
- `utils/`: Shared helpers for logging, JWTs, password hashing, responses, validation, and event identity.
- `constants/`: Central values such as API paths, HTTP status codes, roles, event statuses, and messages.
- `scripts/`: Database setup and local admin/test scripts.

## Main Chat API Flow

The chat assistant flow starts from `backend/routes/chatRoutes.js`.

Important endpoints:

- `POST /api/chat/session`: creates a new chat session.
- `GET /api/chat/session/:sessionId`: loads a saved session.
- `POST /api/chat/message`: sends a user message to the assistant.
- `DELETE /api/chat/session/:sessionId`: deletes a session.

All chat routes use JWT authentication through `verifyJWTToken`.

## Creating A Chat Session

The route `POST /api/chat/session` calls `chatController.createSession`.

The controller does this:

1. Reads the authenticated user from `req.user`.
2. Reads optional `eventId` if the user wants to edit an existing event.
3. Reads language from `req.body.language`, then `Accept-Language`, then defaults to English.
4. Creates an empty event draft using `openaiService.createEmptyDraft(language)`.
5. If `eventId` exists, loads that event and converts it into the chat draft shape.
6. Calculates the next missing field using `openaiService.getNextStep(eventDraft)`.
7. Stores the session using `chatSessionRepository.create`.
8. Generates a greeting using the LLM through `openaiService.generateGreeting(language)`.
9. Stores the assistant greeting in `conversation_history`.
10. Returns the session ID, greeting, language, next step, draft, suggestions, summary, and field metadata.

## What Is Stored In `chat_sessions`

The `chat_sessions` table has these main columns:

- `id`: UUID for the chat session.
- `user_id`: owner of the chat session.
- `session_data`: JSONB containing the full resumable chat state.
- `current_step`: the next field the assistant should collect.
- `language`: active chat language, such as `en`, `de`, or `fr`.
- `expires_at`: session expiry timestamp.
- `created_at`: database creation time.
- `updated_at`: database update time.

Inside `session_data`, this project stores:

- `id`: same session UUID.
- `user_id`: owner user ID.
- `conversation_history`: array of chat messages.
- `event_draft`: temporary event object extracted from the conversation.
- `current_step`: next required field.
- `language`: active language.
- `state`: current chat state, usually `init`, `collecting`, or `confirming`.
- `mode`: `create` or `update`.
- `event_id`: existing event ID when editing.
- `created_at`: session creation timestamp.
- `updated_at`: session update timestamp.
- `expires_at`: session expiry timestamp.

Each `conversation_history` item stores:

- `role`: `user` or `bot`.
- `content`: message text.
- `timestamp`: when the message was stored.

The `event_draft` stores the temporary event payload:

- `name`
- `subheading`
- `description`
- `bannerUrl`
- `timezone`
- `status`
- `startTime`
- `endTime`
- `vanishTime`
- `roles`
- `language`

This draft is not the final event yet. It is the working memory used while the assistant asks questions and fills missing fields.

## Sending A Chat Message

The route `POST /api/chat/message` calls `chatController.sendMessage`.

The controller does this:

1. Validates `sessionId` and `message`.
2. Loads the chat session from `chatSessionRepository.getById`.
3. Checks the logged-in user owns the session.
4. Adds the user message to `conversation_history`.
5. Reloads the session so the latest history is available.
6. Builds compact conversation history by keeping the last 14 bot/user messages.
7. Calls `openaiService.processMessage`.
8. Receives structured LLM output.
9. Normalizes the returned draft.
10. Updates `chat_sessions.session_data`, `current_step`, and `language`.
11. Adds the assistant reply to `conversation_history`.
12. Validates the draft.
13. If the draft is complete and confirmed, inserts or updates the final event.
14. Returns reply, draft, suggestions, validation, and event creation/update status to the frontend.

## How Automatic Language Detection Works

Language utilities are in `backend/services/chatEventUtils.js`.

Supported languages:

- `en`
- `de`
- `fr`

`normalizeLanguage` converts language values into one of those codes. For example, `de-DE` becomes `de`, `fr-FR` becomes `fr`, and unknown values become `en`.

`detectLanguage` checks the latest user message for German and French marker words. If German or French clearly wins, that language is used. Otherwise the previous language is kept.

In `openaiService.processMessage`, language is chosen like this:

- If `languageLocked` is true, use the manually selected language.
- Otherwise, detect the language from the latest message, with the current draft language as fallback.

The chosen language controls:

- The LLM system prompt.
- The assistant reply language.
- Suggestions returned to the frontend.
- The draft `language`.
- The saved session `language`.
- The final event `language`.

## How The LLM Extracts Structured Data

The LLM workflow is in `backend/services/openaiService.js`.

`processMessage` receives:

- `userMessage`: latest user text.
- `conversationHistory`: recent chat messages.
- `currentEventData`: current saved draft.
- `language`: requested or fallback language.
- `options`: currently includes `languageLocked`.

Then it:

1. Chooses the effective language.
2. Normalizes the current draft with `normalizeDraft`.
3. Builds the system prompt with `getSystemPrompt`.
4. Builds a context message containing:
   - current event data summary,
   - supported timezones,
   - supported statuses,
   - supported roles,
   - latest user message.
5. Calls OpenRouter through `callOpenRouter`.

The system prompt tells the model to return JSON only. The required JSON shape is:

```json
{
  "intent": "collect|update|confirm|clarify|cancel",
  "language": "en|de|fr",
  "extractedData": {
    "name": "string or null",
    "subheading": "string or null",
    "description": "string or null",
    "bannerUrl": "string or null",
    "timezone": "string or null",
    "status": "Draft|Published|Pending|null",
    "startTime": "YYYY-MM-DD HH:mm or natural-language text or null",
    "endTime": "YYYY-MM-DD HH:mm or natural-language text or null",
    "vanishTime": "YYYY-MM-DD HH:mm or natural-language text or null",
    "roles": ["Admin", "Manager", "Sales Rep", "Viewer"]
  },
  "changedFields": ["fieldName"],
  "nextStep": "name|subheading|description|bannerUrl|timezone|status|startTime|endTime|vanishTime|roles|confirm",
  "message": "assistant reply",
  "confidence": 0.0
}
```

The important idea is that the LLM does not directly write to the database. It only returns a structured proposal. The backend normalizes and validates that proposal before saving anything.

## How The LLM Response Is Parsed

`callOpenRouter` sends the request to OpenRouter with `response_format: { type: 'json_object' }`.

After the provider returns text, the backend uses:

- `extractContent`: gets the assistant message content from the provider response.
- `tryParseStructuredLlmContent`: parses complete JSON.
- `tryParsePartialStructuredLlmContent`: recovers useful fields from broken or partial JSON.
- `normalizeParsedResponse`: forces the parsed result into the backend contract.
- `extractFriendlyMessage`: strips structured JSON and keeps only the user-facing assistant text.

This makes the app more resilient if the provider returns fenced JSON, extra text, or partial JSON.

## How Extracted Data Is Merged

Merging happens in `chatEventUtils.mergeDraft`.

The current saved draft is normalized first. Then new `extractedData` from the model is applied over the old draft.

After merging, the backend normalizes:

- `bannerUrl`
- `timezone`
- `status`
- `startTime`
- `endTime`
- `vanishTime`
- `roles`
- `language`

The backend also handles helpful date rules:

- If start time exists and end time is missing, end time defaults to one hour after start.
- If end time exists and vanish time is missing, vanish time defaults to 24 hours after end.
- Phrases like “same day one hour later” can be converted relative to start time.
- Phrases like “one day after end” or “one week after end” can be converted relative to end time.

## How Validation Works

Validation happens in `chatEventUtils.validateEventData`.

Required fields:

- `name`
- `subheading`
- `description`
- `bannerUrl`
- `timezone`
- `status`
- `startTime`
- `endTime`
- `vanishTime`
- `roles`

Validation checks:

- All required fields are present.
- `endTime` is after `startTime`.
- `vanishTime` is after `endTime`.
- `bannerUrl` is a valid HTTP/HTTPS URL.
- All roles are supported roles.

The LLM can suggest values, but validation is deterministic backend logic.

## When Data Is Only Stored In Chat Session

Data stays only in `chat_sessions` while:

- the assistant is still collecting missing fields,
- validation fails,
- the user has not confirmed the final draft,
- the user is making corrections,
- the session is in `collecting` or `confirming` state.

During this stage, the database `events` table is not changed.

The chat session is updated on every message with:

- latest `conversation_history`,
- latest `event_draft`,
- latest `current_step`,
- latest `state`,
- latest `language`,
- refreshed expiry time.

## When Data Is Inserted Into The Database

Final event insertion happens inside `chatController.sendMessage`.

The backend commits the event only when:

- the LLM/user intent indicates confirmation, or
- the draft is ready and the user sends an approval message such as `yes`, `confirm`, `save`, or `looks good`,
- and `validateEventData(eventDraft)` returns valid.

If validation is not valid, the controller returns a message explaining missing fields or errors. It does not insert the event.

## Creating A New Event

For a new event, the controller:

1. Builds a normalized event identity using `buildEventIdentity`.
2. Hashes the identity using `hashEventIdentity`.
3. Claims an idempotency record, if `idempotencyRepository` is available.
4. Checks for an equivalent existing event using `eventRepository.findEquivalentEvent`.
5. If no duplicate exists, calls `eventRepository.createWithRoles`.

`createWithRoles` uses a transaction:

1. Insert into `events`.
2. Get the new event ID.
3. Insert role mappings into `event_roles`.
4. Return the complete event with its roles.

The event row stores:

- `name`
- `subheading`
- `description`
- `banner_url`
- `timezone`
- `status`
- `start_time`
- `end_time`
- `vanish_time`
- `language`
- `created_by`

The `event_roles` table stores:

- `event_id`
- `role_id`

This is a many-to-many relationship between events and roles.

## Updating An Existing Event

If the session was created with an `eventId`, the session mode is `update`.

When confirmed, the controller calls `eventRepository.updateWithRoles`.

That method uses a transaction:

1. Update the existing `events` row.
2. Delete old role mappings for that event.
3. Insert the new role mappings.
4. Return the updated event with roles.

## Duplicate And Idempotency Protection

The backend has two protections before creating a chat event.

Idempotency protection:

- Uses `idempotency_keys`.
- Prevents the same chat session from creating multiple events because of repeated requests.
- Stores response status/body so repeated calls can replay the same result.

Duplicate event protection:

- Uses `eventRepository.findEquivalentEvent`.
- Compares normalized identity fields:
  - owner,
  - name,
  - subheading,
  - timezone,
  - status,
  - start time,
  - end time,
  - vanish time,
  - language,
  - roles.
- If an equivalent event exists, the backend returns a duplicate response instead of inserting.

## What Happens After Successful Save

After a new event is created or an existing event is updated:

1. The controller deletes the chat session using `chatSessionRepository.remove(sessionId)`.
2. The user receives a localized success message.
3. The API response includes:
   - `eventCreated` or `eventUpdated`,
   - created or updated event ID,
   - final draft,
   - summary,
   - validation result.

Deleting the chat session is intentional because the temporary draft is no longer needed after the final event has been committed.

## File Fallback For Chat Sessions

`chatSessionRepository` normally stores sessions in PostgreSQL.

If `ENABLE_FILE_SESSION_FALLBACK=true`, and database operations fail, the repository can fall back to JSON files in `backend/sessions`.

This is mainly useful for local development. Production should use database storage.

## Important Files For This Flow

- `backend/routes/chatRoutes.js`: chat API endpoints.
- `backend/controllers/chatController.js`: HTTP chat flow and final commit logic.
- `backend/services/openaiService.js`: prompt, LLM call, response parsing, localization.
- `backend/services/chatEventUtils.js`: language detection, draft normalization, merging, validation, suggestions.
- `backend/repositories/chatSessionRepository.js`: chat session storage.
- `backend/repositories/eventRepository.js`: final event storage and duplicate detection.
- `backend/repositories/eventRoleRepository.js`: role assignment storage.
- `backend/repositories/idempotencyRepository.js`: repeated request protection.
- `backend/utils/eventIdentity.js`: normalized duplicate-event identity.
- `backend/data/dataContexts/postgresDataContext.js`: PostgreSQL query and transaction wrapper.
- `backend/Database.sql`: database schema.

## Short End-To-End Example

1. User creates a chat session.
2. Backend stores an empty `event_draft` in `chat_sessions`.
3. User says: “Create a product launch tomorrow at 10 AM for Admin and Manager.”
4. Backend stores the user message.
5. Backend sends the latest message, current draft, and recent history to the LLM.
6. LLM returns structured JSON with extracted event fields.
7. Backend normalizes and merges the extracted fields into `event_draft`.
8. Backend validates the draft.
9. If fields are missing, backend saves the draft in `chat_sessions` and asks the next question.
10. User provides missing fields.
11. Backend keeps updating `chat_sessions`.
12. When all fields are present, backend asks for confirmation.
13. User confirms.
14. Backend validates again.
15. Backend checks idempotency and duplicates.
16. Backend inserts into `events`.
17. Backend inserts role mappings into `event_roles`.
18. Backend deletes the completed chat session.
19. Backend returns success response.
