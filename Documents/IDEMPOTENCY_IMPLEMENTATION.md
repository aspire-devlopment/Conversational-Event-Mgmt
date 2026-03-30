# Idempotency Implementation

## Purpose

Idempotency prevents the same event creation request from creating multiple events when:

- the user double-clicks submit
- the frontend retries after a timeout
- the network drops after the server already created the event
- the client resends the same request intentionally or accidentally

This implementation applies to event creation.

## Where it is implemented

Main files:

- `backend/schema.sql`
- `backend/middleware/idempotencyMiddleware.js`
- `backend/repositories/idempotencyRepository.js`
- `backend/utils/eventIdentity.js`
- `backend/controllers/eventController.js`
- `backend/controllers/chatController.js`
- `frontend/src/services/api.js`

## Data model

The table is:

- `idempotency_keys`

Stored fields:

- `user_id`
- `scope`
- `idempotency_key`
- `request_hash`
- `status`
- `response_status_code`
- `response_body`
- `resource_id`
- `created_at`
- `updated_at`

Important constraint:

- unique `(user_id, scope, idempotency_key)`

This ensures one key can only represent one logical request for one user within one route scope.

## Request flow for direct API create

Route:

- `POST /api/events`

Frontend behavior:

- `frontend/src/services/api.js` generates an `Idempotency-Key`
- the key is sent as a request header

Backend behavior:

1. `idempotencyMiddleware` reads `Idempotency-Key`
2. it builds a normalized event identity from the request body
3. it hashes that normalized identity into `request_hash`
4. it tries to claim the key in `idempotency_keys`

Possible outcomes:

- first request:
  - key is inserted with status `pending`
  - request continues normally

- same key + same payload:
  - stored response is returned
  - no second event is created

- same key + different payload:
  - request is rejected with `409 Conflict`

- same key while first request is still in progress:
  - request is rejected with `409 Conflict`

After event creation completes:

- the final HTTP status code and response body are saved to `idempotency_keys`

If the request fails:

- the error response is also stored

This keeps retries consistent.

## Request flow for chat-based create

Route:

- `POST /api/chat/message`

Chat does not rely on the browser sending an idempotency header.

Instead:

- the backend derives an internal idempotency key from the chat session id

Scope used:

- `chat:event:create`

Key format:

- `chat-create:<sessionId>`

Why this works:

- one chat session should produce at most one finalized event creation result
- if the client retries after the chat session has already been deleted, the stored response can still be replayed

## Duplicate validation vs idempotency

These are separate protections.

### Idempotency

Protects against repeated submission of the same request.

### Duplicate validation

Protects against creating an equivalent event even when the request is new.

Current duplicate comparison ignores:

- `description`
- `banner_url`

Current duplicate comparison includes:

- `created_by`
- `name`
- `subheading`
- `timezone`
- `status`
- `start_time`
- `end_time`
- `vanish_time`
- `language`
- role set

## Normalized request identity

The request hash is built from normalized event data in:

- `backend/utils/eventIdentity.js`

Normalization includes:

- trimmed strings
- lowercase comparisons where appropriate
- normalized datetime strings
- sorted and deduplicated role names

This avoids false mismatches caused by formatting differences.

## Response replay examples

### First request

```http
POST /api/events
Idempotency-Key: 6f6d4f1d-5ef5-4c35-8d0c-123456789abc
```

Result:

- event is created
- response is saved

### Retry with same key and same payload

```http
POST /api/events
Idempotency-Key: 6f6d4f1d-5ef5-4c35-8d0c-123456789abc
```

Result:

- original saved response is returned
- no second event is inserted

### Retry with same key but different payload

```http
POST /api/events
Idempotency-Key: 6f6d4f1d-5ef5-4c35-8d0c-123456789abc
```

Result:

- `409 Conflict`

Reason:

- the key is already bound to a different normalized request hash

## Performance impact

Performance impact is small but real.

Extra work added per create request:

- one insert-or-conflict check in `idempotency_keys`
- one follow-up read when conflict happens
- one final update to store the response
- one duplicate-check query against events

Why it is acceptable:

- event creation is not a hot loop operation
- these are indexed lookups
- the safety benefit is much larger than the small DB overhead

Main long-term cost:

- `idempotency_keys` will grow over time

Recommended future improvement:

- add cleanup for old rows, for example deleting keys older than 7 to 30 days

## Operational note

Because the table is part of `backend/schema.sql`, you must recreate or migrate the database for this feature to work.

For the current Docker setup:

```powershell
docker compose down -v
docker compose up --build
```

