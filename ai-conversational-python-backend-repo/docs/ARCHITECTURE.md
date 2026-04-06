# Python Backend Architecture

## Overview

The Python backend follows a layered architecture so HTTP concerns, business rules, database access, and provider integrations stay separated.

## Layers

- `app/core`
  Holds configuration, database helpers, security utilities, exceptions, and shared logging helpers.
- `app/domain`
  Holds pure domain logic such as event-draft normalization, validation, language handling, and reusable constants.
- `app/application`
  Holds use-case orchestration such as authentication, event operations, LLM orchestration, and conversational event creation.
- `app/infrastructure`
  Holds PostgreSQL repositories and other boundary-facing implementations.
- `app/presentation`
  Holds FastAPI routes, schemas, auth dependencies, and middleware.

## Request Flow

1. An HTTP request enters FastAPI.
2. Middleware adds trace context, auth context, and security headers.
3. A route validates input through Pydantic schemas.
4. Application services coordinate business logic.
5. Repositories interact with PostgreSQL.
6. A consistent JSON response is returned to the frontend.
7. Request and error logs are written through the shared logging pipeline.

## Architectural Decisions

- FastAPI was chosen because the project is API-first and React-driven.
- PostgreSQL remains shared with the original Node backend schema.
- Chat behavior is modeled as a stateful session workflow backed by the `chat_sessions` table.
- The LLM layer is provider-abstracted so OpenRouter, Gemini, and Groq can be swapped through configuration.

## Key Files

- [main.py](/e:/AI-Conversational/python_backend/app/main.py)
- [chat_service.py](/e:/AI-Conversational/python_backend/app/application/services/chat_service.py)
- [event_service.py](/e:/AI-Conversational/python_backend/app/application/services/event_service.py)
- [auth_service.py](/e:/AI-Conversational/python_backend/app/application/services/auth_service.py)
- [event_repository.py](/e:/AI-Conversational/python_backend/app/infrastructure/repositories/event_repository.py)
- [request_context.py](/e:/AI-Conversational/python_backend/app/presentation/middleware/request_context.py)
