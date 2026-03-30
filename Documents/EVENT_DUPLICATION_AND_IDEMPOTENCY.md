# Event Duplication And Idempotency

## Current behavior

### Duplicate event validation

There is now a duplicate-event check in both create flows:

- Route: `POST /api/events`
- Route: `POST /api/chat/message` when chat confirms event creation
- Files:
  - `backend/routes/eventRoutes.js`
  - `backend/middleware/requestValidators.js`
  - `backend/repositories/eventRepository.js`

Current duplicate detection logic:

- same `created_by`
- same `name`
- same `subheading`
- same `timezone`
- same `status`
- same `start_time`
- same `end_time`
- same `vanish_time`
- same `language`
- same role set
- ignores `banner_url`
- ignores `description`

Repository query:

- `eventRepository.findEquivalentEvent(identity, excludeEventId)`

### What is still not covered

- same location

Important note:

- the current schema does not have a `location` column in `events`
- so "same time and same location" cannot be enforced yet in the current data model

### Chat flow

The chat-based event creation path currently creates events directly in:

- `backend/controllers/chatController.js`
 
It now applies the same event-identity duplicate rule directly in the controller before insert.

## Idempotency status

Idempotency is now implemented for event creation.

Implemented behavior:

- direct event API supports `Idempotency-Key`
- idempotency records are stored in `idempotency_keys`
- same user + same scope + same key + same payload returns the original response
- same user + same scope + same key + different payload returns `409 Conflict`
- chat create uses a server-derived idempotency key based on the chat session id
- if a chat create succeeds and the client retries after the session was removed, the stored response is replayed

## Related protections already present

- `event_roles` has a composite primary key on `(event_id, role_id)`
- this prevents the same role from being assigned twice to the same event

This helps role assignment consistency, but it does **not** solve event-level idempotency.

## Recommended approach

### Short-term

The implemented duplicate criteria for current schema are:

- same `created_by`
- same `name`
- same `subheading`
- same `timezone`
- same `status`
- same `start_time`
- same `end_time`
- same `vanish_time`
- same `language`
- same roles
- ignore `description`
- ignore `banner_url`

### If location-based duplicate protection is required

Add a real event location field first, for example:

- `location_text`
- or `venue_id` if venues are normalized

Without a location field in the schema, the system cannot enforce "same location" duplication rules.
