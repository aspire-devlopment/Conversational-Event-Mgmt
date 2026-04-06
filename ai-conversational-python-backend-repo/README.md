# Python Backend

This folder contains a parallel Python backend for the existing frontend and PostgreSQL schema. It is structured so the React app can talk to FastAPI without changing the frontend API client contract.

Detailed Python-specific documents are available under:

- [docs/README.md](/e:/AI-Conversational/python_backend/docs/README.md)

## Architecture

- `app/core`: configuration, database access, and security helpers
- `app/domain`: chat draft normalization, validation, and shared constants
- `app/application`: auth, events, LLM orchestration, and chat use-cases
- `app/infrastructure`: PostgreSQL repositories
- `app/presentation`: FastAPI routes and auth dependencies

### Added Professionalization Pieces

- Pydantic request and response view models under `app/presentation/schemas`
- Request correlation-id and access logging middleware under `app/presentation/middleware`
- Structured JSON logging helpers under `app/core/logging.py`
- Shared application exceptions under `app/core/exceptions.py`
- Alembic migration scaffolding under `python_backend/alembic`

## API Surface

The Python backend mirrors the routes used by the current frontend:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/users`
- `POST /api/admin/users/{id}/reset-password`
- `GET /api/events`
- `GET /api/events/{id}`
- `POST /api/events`
- `PUT /api/events/{id}`
- `DELETE /api/events/{id}`
- `POST /api/chat/session`
- `GET /api/chat/session/{sessionId}`
- `POST /api/chat/message`
- `DELETE /api/chat/session/{sessionId}`

## Database

This backend uses the same PostgreSQL schema defined in [Database.sql](/e:/AI-Conversational/backend/Database.sql).

## Setup

1. Install dependencies:

```bash
pip install -r python_backend/requirements.txt
```

2. Copy env vars:

```bash
copy python_backend\\.env.example python_backend\\.env
```

3. Update `python_backend/.env` with your PostgreSQL and LLM settings.

4. Run the API:

```bash
cd python_backend
python run.py
```

The default backend URL is `http://localhost:8000/api`.

## Production Security

The FastAPI app now includes:

- JWT auth context built in middleware
- request correlation-id middleware
- structured JSON request/error logging
- security headers middleware
- trusted host enforcement
- optional HTTPS redirect via `FORCE_HTTPS=true`

Recommended production environment values:

```env
APP_ENV=production
FORCE_HTTPS=true
TRUSTED_HOSTS=your-domain.com,www.your-domain.com
```

If you deploy behind a reverse proxy or load balancer, terminate TLS there and forward only HTTPS traffic to the app.

## Migrations

Because this project already has an existing PostgreSQL schema, start Alembic by stamping the baseline revision:

```bash
cd python_backend
alembic stamp 0001_baseline_existing_schema
```

Migration notes are documented in [alembic/README.md](/e:/AI-Conversational/python_backend/alembic/README.md).

## Frontend

Point the frontend to the Python backend with:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

## Notes

- The chat layer preserves the current frontend response shapes.
- Pasted JSON event data is handled directly and fills the event draft without relying only on the model.
- OpenRouter is the easiest drop-in provider, but Gemini is also supported.
- FastAPI is the better fit than DRF here because this project is API-first, React-driven, and LLM/chat heavy rather than Django-admin centric.

## Docker

Build and run the Python backend container:

```bash
cd python_backend
docker build -t ai-conversational-python-backend .
docker run --env-file .env -p 8000:8000 ai-conversational-python-backend
```
