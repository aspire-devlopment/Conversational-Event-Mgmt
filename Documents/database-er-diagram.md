# Database ER Diagram

This document shows the database tables in the project and how they relate to each other.

## ER Diagram

```mermaid
erDiagram
    ROLES {
        serial id PK
        varchar name UNIQUE
    }

    USERS {
        serial id PK
        varchar first_name
        varchar last_name
        varchar email UNIQUE
        varchar contact_number
        text password_hash
        int role_id FK
        timestamp created_at
        timestamp updated_at
    }

    EVENTS {
        serial id PK
        varchar name
        varchar subheading
        text description
        text banner_url
        varchar timezone
        varchar status
        timestamp start_time
        timestamp end_time
        timestamp vanish_time
        varchar language
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }

    EVENT_ROLES {
        int event_id PK, FK
        int role_id PK, FK
    }

    CHAT_SESSIONS {
        uuid id PK
        int user_id FK
        jsonb session_data
        varchar current_step
        varchar language
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    IDEMPOTENCY_KEYS {
        bigserial id PK
        int user_id FK
        varchar scope
        varchar idempotency_key
        varchar request_hash
        varchar status
        int response_status_code
        jsonb response_body
        int resource_id
        timestamp created_at
        timestamp updated_at
    }

    ERROR_LOGS {
        bigserial id PK
        uuid trace_id
        varchar method
        text path
        int status_code
        text error_message
        text error_stack
        jsonb request_body
        timestamp created_at
    }

    ROLES ||--o{ USERS : "role_id"
    USERS ||--o{ EVENTS : "created_by"
    USERS ||--o{ CHAT_SESSIONS : "user_id"
    USERS ||--o{ IDEMPOTENCY_KEYS : "user_id"
    EVENTS ||--o{ EVENT_ROLES : "event_id"
    ROLES ||--o{ EVENT_ROLES : "role_id"
```

## Relationship Summary

| Parent Table | Child Table | Relationship | Notes |
|---|---|---|---|
| `roles` | `users` | One role to many users | `users.role_id` points to `roles.id` and uses `ON DELETE SET NULL` |
| `users` | `events` | One user to many events | `events.created_by` points to `users.id` and uses `ON DELETE SET NULL` |
| `events` | `event_roles` | One event to many join rows | `ON DELETE CASCADE` removes join rows when an event is deleted |
| `roles` | `event_roles` | One role to many join rows | `ON DELETE CASCADE` removes join rows when a role is deleted |
| `users` | `chat_sessions` | One user to many chat sessions | `ON DELETE CASCADE` removes sessions when the user is deleted |
| `users` | `idempotency_keys` | One user to many idempotency keys | `ON DELETE CASCADE` removes keys when the user is deleted |
| `error_logs` | None | Standalone audit table | No foreign keys, stores request/error history only |

## Table Notes

- `roles`
  - Stores the system roles: Admin, Manager, Sales Rep, and Viewer.

- `users`
  - Stores user accounts and links each user to one role.

- `events`
  - Stores the event metadata created through chat or the legacy API.

- `event_roles`
  - Join table for the many-to-many relationship between events and roles.

- `chat_sessions`
  - Stores the current conversational draft, step, language, and expiry time.

- `idempotency_keys`
  - Prevents duplicate event creation when the same request is submitted more than once.

- `error_logs`
  - Stores application error details for auditing and debugging.

## Key Constraints

- `roles.name` is unique.
- `users.email` is unique.
- `event_roles` uses a composite primary key: `(event_id, role_id)`.
- `events.status` is limited to `Draft`, `Published`, or `Pending`.
- `events.start_time` must be before `events.end_time`.
- `events.vanish_time` must be null or later than `end_time`.
- `idempotency_keys` has a unique constraint on `(user_id, scope, idempotency_key)`.

## Relationship Logic

- A user can create many events.
- A user can have many active chat sessions over time.
- A single event can be visible to multiple roles.
- A role can be attached to many events.
- Idempotency keys are stored per user so repeated submissions can be detected safely.

