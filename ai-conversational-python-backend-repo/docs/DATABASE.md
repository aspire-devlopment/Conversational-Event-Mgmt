# Python Backend Database Notes

## Shared Schema

The Python backend uses the same PostgreSQL schema as the original backend:

- [Database.sql](/e:/AI-Conversational/backend/Database.sql)

## Core Tables

- `roles`
- `users`
- `events`
- `event_roles`
- `chat_sessions`
- `idempotency_keys`
- `error_logs`

## Python Repository Layer

The Python backend interacts with the database through repositories under:

- [repositories](/e:/AI-Conversational/python_backend/app/infrastructure/repositories)

Current repositories include:

- `user_repository.py`
- `role_repository.py`
- `event_repository.py`
- `chat_session_repository.py`
- `log_repository.py`

## Transaction and Locking Approach

- event creation and event-role synchronization are done in one transaction
- row-level locking is used for selected update flows
- paginated reads are bounded to reduce heavy scans
- database error logs are persisted into `error_logs`

## Migrations

Alembic is configured under:

- [alembic](/e:/AI-Conversational/python_backend/alembic)

Baseline command:

```bash
cd python_backend
alembic stamp 0001_baseline_existing_schema
```
