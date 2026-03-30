# Database Table Info

This document explains the purpose of each database table in the event management system and how the tables work together.

## 1. `roles`

| Column | Type | Purpose |
|---|---|---|
| `id` | `SERIAL` | Primary key for the role. |
| `name` | `VARCHAR(50)` | Unique role name such as `Admin`, `Manager`, `Sales Rep`, or `Viewer`. |

**Purpose**
- Stores the system-wide roles used for access control.
- Acts as the source of truth for role-based permissions and event visibility.

## 2. `users`

| Column | Type | Purpose |
|---|---|---|
| `id` | `SERIAL` | Primary key for the user. |
| `first_name` | `VARCHAR(100)` | User’s first name. |
| `last_name` | `VARCHAR(100)` | User’s last name. |
| `email` | `VARCHAR(255)` | Unique login identifier. |
| `contact_number` | `VARCHAR(20)` | Optional contact number. |
| `password_hash` | `TEXT` | Hashed password for authentication. |
| `role_id` | `INT` | Foreign key to `roles.id`. |
| `created_at` | `TIMESTAMP` | When the user record was created. |
| `updated_at` | `TIMESTAMP` | When the user record was last updated. |

**Purpose**
- Stores account information for people who sign in to the system.
- Links each user to one role for authorization.

## 3. `events`

| Column | Type | Purpose |
|---|---|---|
| `id` | `SERIAL` | Primary key for the event. |
| `name` | `VARCHAR(255)` | Event name. |
| `subheading` | `VARCHAR(255)` | Short supporting title. |
| `description` | `TEXT` | Full event description. |
| `banner_url` | `TEXT` | URL of the banner image. |
| `timezone` | `VARCHAR(50)` | Event time zone. |
| `status` | `VARCHAR(20)` | Event state: `Draft`, `Published`, or `Pending`. |
| `start_time` | `TIMESTAMP` | Event start date and time. |
| `end_time` | `TIMESTAMP` | Event end date and time. |
| `vanish_time` | `TIMESTAMP` | When the event should disappear from view. |
| `language` | `VARCHAR(10)` | Language used for the event content. |
| `created_by` | `INT` | Foreign key to `users.id`. |
| `created_at` | `TIMESTAMP` | When the event record was created. |
| `updated_at` | `TIMESTAMP` | When the event record was last updated. |

**Purpose**
- Stores the main event record created through the chat assistant or API.
- Holds all structured event metadata in one place.

## 4. `event_roles`

| Column | Type | Purpose |
|---|---|---|
| `event_id` | `INT` | Foreign key to `events.id`. |
| `role_id` | `INT` | Foreign key to `roles.id`. |

**Purpose**
- Join table for the many-to-many relationship between events and roles.
- Lets one event be visible to multiple roles.
- Lets one role be assigned to multiple events.

## 5. `chat_sessions`

| Column | Type | Purpose |
|---|---|---|
| `id` | `UUID` | Primary key for the chat session. |
| `user_id` | `INT` | Foreign key to `users.id`. |
| `session_data` | `JSONB` | Stores the conversational draft and context. |
| `current_step` | `VARCHAR(100)` | Tracks the current step in the conversation. |
| `language` | `VARCHAR(10)` | Stores the detected conversation language. |
| `expires_at` | `TIMESTAMP` | When the session expires. |
| `created_at` | `TIMESTAMP` | When the session was created. |
| `updated_at` | `TIMESTAMP` | When the session was last updated. |

**Purpose**
- Stores the live chat state for event creation and editing.
- Keeps the assistant context so the conversation can continue step by step.

## 6. `idempotency_keys`

| Column | Type | Purpose |
|---|---|---|
| `id` | `BIGSERIAL` | Primary key for the idempotency record. |
| `user_id` | `INT` | Foreign key to `users.id`. |
| `scope` | `VARCHAR(100)` | Logical area where the key is used, such as event creation. |
| `idempotency_key` | `VARCHAR(255)` | Unique request key supplied by the client. |
| `request_hash` | `VARCHAR(64)` | Hash of the incoming request body. |
| `status` | `VARCHAR(20)` | Processing state such as `pending`. |
| `response_status_code` | `INT` | HTTP status returned for the request. |
| `response_body` | `JSONB` | Stored response for safe retries. |
| `resource_id` | `INT` | Related created resource id, if any. |
| `created_at` | `TIMESTAMP` | When the key record was created. |
| `updated_at` | `TIMESTAMP` | When the record was last updated. |

**Purpose**
- Prevents duplicate event creation when the same request is retried.
- Helps make the API safer and more reliable for repeated submissions.

## 7. `error_logs`

| Column | Type | Purpose |
|---|---|---|
| `id` | `BIGSERIAL` | Primary key for the error log entry. |
| `trace_id` | `UUID` | Correlation id for tracing a request. |
| `method` | `VARCHAR(10)` | HTTP method of the failing request. |
| `path` | `TEXT` | Request path. |
| `status_code` | `INT` | Response status code. |
| `error_message` | `TEXT` | Main error message. |
| `error_stack` | `TEXT` | Stack trace or detailed error info. |
| `request_body` | `JSONB` | Request payload that triggered the error. |
| `created_at` | `TIMESTAMP` | When the error was logged. |

**Purpose**
- Stores backend error details for debugging and auditing.
- Useful for tracing failures in chat, authentication, or event operations.

## Table Relationships

| Parent Table | Child Table | Relationship | Meaning |
|---|---|---|---|
| `roles` | `users` | One-to-many | Each user belongs to one role. |
| `users` | `events` | One-to-many | A user can create many events. |
| `events` | `event_roles` | One-to-many | One event can be linked to many roles. |
| `roles` | `event_roles` | One-to-many | One role can be linked to many events. |
| `users` | `chat_sessions` | One-to-many | A user can have many chat sessions over time. |
| `users` | `idempotency_keys` | One-to-many | A user can have many idempotency records. |
| `error_logs` | None | Standalone | Stores logs only, no foreign key links. |

## Why the Tables Are Structured This Way

- `roles` keeps permissions centralized.
- `users` stores identity and access information.
- `events` keeps all event details in one record.
- `event_roles` supports multi-select role visibility.
- `chat_sessions` preserves the conversational workflow.
- `idempotency_keys` avoids duplicate writes.
- `error_logs` helps with troubleshooting and monitoring.

## Notes

- `users.role_id` uses `ON DELETE SET NULL` so users are not deleted if a role is removed.
- `events.created_by` uses `ON DELETE SET NULL` so event history remains even if the creator is removed.
- `event_roles` uses `ON DELETE CASCADE` so join rows are cleaned up automatically.
- `chat_sessions` and `idempotency_keys` also use `ON DELETE CASCADE` to keep the database clean.
- `events.status` is restricted to `Draft`, `Published`, and `Pending`.
- `events.start_time` must be earlier than `events.end_time`.
- `events.vanish_time` must be null or later than `end_time`.

