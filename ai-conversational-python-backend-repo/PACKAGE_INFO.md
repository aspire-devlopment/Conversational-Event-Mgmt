# Python Backend Package Info

This file explains the main Python packages used in the FastAPI backend and why they were chosen.

## Runtime Packages

- `fastapi`
  Purpose: API framework for route handling, dependency injection, validation, and OpenAPI docs.
  Why: Best fit for an API-first React + chat backend.

- `uvicorn[standard]`
  Purpose: ASGI server used to run FastAPI in development and production containers.
  Why: Lightweight, widely used, and well supported with FastAPI.

- `psycopg[binary]`
  Purpose: PostgreSQL driver.
  Why: Modern PostgreSQL client for Python with good performance and straightforward SQL usage.

- `PyJWT`
  Purpose: JWT encode/decode for stateless authentication.
  Why: Matches the existing JWT-based frontend/backend contract.

- `passlib[bcrypt]`
  Purpose: Password hashing and verification.
  Why: Secure password storage with bcrypt support.

- `httpx`
  Purpose: Async HTTP client for calling LLM providers.
  Why: Clean async API and production-ready timeout support.

- `python-dotenv`
  Purpose: Local environment variable loading.
  Why: Useful for local development.

- `pydantic-settings`
  Purpose: Typed application settings from environment variables.
  Why: Keeps config centralized and validated.

- `dateparser`
  Purpose: Natural-language date parsing for chat event drafts.
  Why: Helpful for phrases like "next Friday at 4 PM".

- `email-validator`
  Purpose: Email validation support for Pydantic.
  Why: Required by `EmailStr`.

## Migration Packages

- `alembic`
  Purpose: Database migrations.
  Why: Standard migration tooling for Python services.

- `SQLAlchemy`
  Purpose: Used by Alembic for migration engine/config support.
  Why: Alembic depends on SQLAlchemy’s engine layer.

## Architectural Notes

- Validation is handled primarily through FastAPI + Pydantic schemas.
- Auth context is built in middleware and enforced through route dependencies.
- CORS, trusted hosts, HTTPS redirect, and security headers are all handled in the FastAPI app layer.
