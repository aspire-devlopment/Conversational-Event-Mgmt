# Agent Help - Event Management Upgrade

This file documents what was implemented for the PostgreSQL schema-based backend upgrade.

## What Was Done

- Added PostgreSQL connectivity using `pg` with pooled connections.
- Added a versioned API layer under `\`/api/v1\`` for schema-based CRUD.
- Implemented repository-service-controller structure (professional layering).
- Introduced lightweight dependency injection by injecting DB/repositories into services/controllers.
- Added centralized constants and reusable response helpers.
- Added request validation middleware with consistent error responses and status codes.
- Added production-style logging middleware with JSON logs, trace IDs, request duration, and DB persistence.
- **Added HTTPS support with Helmet.js security headers** (Strict-Transport-Security, X-Frame-Options, CSP, etc.).
- **Added parameterized queries** throughout all repositories to prevent SQL injection.
- **Added CORS policy** restricting origins, methods, and headers.
- Kept legacy endpoints (`/api/auth`, `/api/events`) intact to avoid frontend breakage.

## Database Schema

The full PostgreSQL schema is defined in `backend/schema.sql`, including tables for users, roles, events, event_roles (M:N mapping), chat_sessions, indexes, and seed data for roles. All repositories are aligned with this schema to ensure data saves correctly.

## New Architecture (Backend)

- `backend/db/pool.js` - PostgreSQL pool config via env vars.
- `backend/data/dataContexts/postgresDataContext.js` - Data context for PostgreSQL operations, enabling DB-independent repositories.
- `backend/data/repositoryFactory.js` - Creates repositories with PostgreSQL data context.
- `backend/data/providers/postgres/*` - PostgreSQL repository provider.
- `backend/repositories/*` - DB-agnostic repositories using parameterized queries (SQL injection prevention).
- `backend/services/crudService.js` - Generic service abstraction.
- `backend/controllers/v1ControllerFactory.js` - Generic CRUD controller factory.
- `backend/controllers/eventRoleController.js` - Event-role assignment handlers.
- `backend/routes/v1Routes.js` - Versioned routes mapping.
- `backend/middleware/securityMiddleware.js` - HTTPS, Helmet.js headers, HSTS, CSP, and security configurations.
- `backend/middleware/v1Validators.js` - Request-level validation for v1 API.
- `backend/middleware/requestLogger.js` - Structured request logging + request timing.
- `backend/middleware/errorHandler.js` - Centralized error handling with trace IDs.
- `backend/middleware/asyncHandler.js` - Wraps async handlers to catch promise rejections.
- `backend/services/loggingService.js` - Logging orchestration for console + DB.
- `backend/repositories/logRepository.js` - Inserts request/error logs in PostgreSQL.
- `backend/utils/jsonLogger.js` - Redaction + JSON logger utility.

## Request/Error Logging

### Structured JSON Log Format

Every request now emits JSON logs:

- `type` (`api_request` / `api_error`)
- `trace_id` (UUID for correlation)
- `method`, `path`, `status_code`
- `duration_ms` (for request logs)
- `request_body` (sensitive fields redacted)
- `response_body` (request logs)
- `error_message`, `error_stack` (error logs)

### Database Log Persistence

Logs are persisted asynchronously (non-blocking) using:

- `api_request_logs`
- `api_error_logs`

If these tables are missing, API flow does not fail; a warning is logged.

Recommended SQL (create manually in cloud DB):

```sql
CREATE TABLE IF NOT EXISTS api_request_logs (
  id BIGSERIAL PRIMARY KEY,
  trace_id UUID,
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  status_code INT NOT NULL,
  duration_ms NUMERIC(10,2) NOT NULL,
  ip_address VARCHAR(100),
  user_agent TEXT,
  request_body JSONB,
  response_body JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_error_logs (
  id BIGSERIAL PRIMARY KEY,
  trace_id UUID,
  method VARCHAR(10),
  path TEXT,
  status_code INT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  request_body JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables Added

In `backend/.env`:

- `DB_PROVIDER` (`postgres` or `mongo`)
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

## CRUD API URLs (Schema Based)

Base prefix: `http://localhost:5000/api/v1`

### Users

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

Sample create body:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "contact_number": "9999999999",
  "password_hash": "hashed_password",
  "role": "Admin"
}
```

### Roles

- `GET /roles`
- `GET /roles/:id`
- `POST /roles`
- `PUT /roles/:id`
- `DELETE /roles/:id`

Sample body:

```json
{ "name": "Manager" }
```

### Events

- `GET /events`
- `GET /events/:id`
- `POST /events`
- `PUT /events/:id`
- `DELETE /events/:id`

Sample create body:

```json
{
  "name": "Annual Summit",
  "subheading": "Future of AI",
  "description": "Detailed event description",
  "banner_url": "https://example.com/banner.png",
  "timezone": "Asia/Kolkata",
  "status": "Draft",
  "start_time": "2026-08-01T10:00:00Z",
  "end_time": "2026-08-01T14:00:00Z",
  "vanish_time": "2026-08-02T00:00:00Z",
  "language": "en",
  "created_by": 1
}
```

### Chat Sessions

- `GET /chat-sessions`
- `GET /chat-sessions/:id`
- `POST /chat-sessions`
- `PUT /chat-sessions/:id`
- `DELETE /chat-sessions/:id`

Sample create body:

```json
{
  "user_id": 1,
  "session_data": { "messages": [], "meta": { "source": "web" } },
  "current_step": "welcome",
  "language": "en"
}
```

### Event Roles (M:N Mapping)

- `GET /event-roles`
- `POST /event-roles/assign`
- `POST /event-roles/unassign`

Sample body:

```json
{
  "event_id": 10,
  "role_id": 2
}
```

## Error Handling Improvements

- Standardized response shape through `utils/response.js`.
- Centralized status constants in `constants/httpStatus.js`.
- Added robust global error middleware with error code.
- Added input validators for IDs and required payload fields.

## Security Implementation

### HTTPS & Protocol Security
- **Helmet.js**: Automatically sets security HTTP headers to prevent common attacks.
- **Strict-Transport-Security (HSTS)**: Forces HTTPS connections for 1 year; browsers will not allow HTTP fallback.
- **Content-Security-Policy (CSP)**: Restricts which origins can load content (scripts, styles, images, etc.).
- **Development Mode**: Uses HTTP for easier local development without certificates.
- **Production Mode**: Requires HTTPS certificates configured via `HTTPS_CERT_PATH` and `HTTPS_KEY_PATH` env vars.
- **HTTPS Redirection**: Automatically redirects HTTP requests to HTTPS in production.

### SQL Injection Prevention
- **Parameterized Queries**: All database queries throughout repositories use `$1, $2` placeholders.
- Example: `query('SELECT * FROM users WHERE id = $1', [userId])` instead of string interpolation.
- PostgreSQL `pg` driver automatically escapes values, preventing SQL injection.

### CORS (Cross-Origin Resource Sharing)
- **Restricted Origins**: Only requests from `FRONTEND_URLS` env var are allowed.
- **Restricted Methods**: Only GET, POST, PUT, DELETE, OPTIONS methods allowed.
- **Restricted Headers**: Only Content-Type and Authorization headers allowed.
- **Credentials**: Cross-origin requests with credentials must match origin exactly.

### Input Validation
- All request payloads validated before reaching controllers (v1Validators.js).
- Validates data types: emails, non-empty strings, positive integers.
- Prevents invalid data from reaching business logic layer.

### Request Logging & Audit Trail
- Every request logged with unique trace ID for correlation.
- Logs include: method, path, status code, duration, IP address, user-agent.
- Sensitive fields (passwords, tokens, email, phone) are redacted before logging.
- Logs persisted to database for auditing and compliance.

### Error Handling
- Errors caught by asyncHandler middleware and centralized error handler.
- Stack traces shown only in development mode (hidden in production for security).
- All errors include trace ID for correlation with request logs.
- Standardized JSON error responses prevent information leakage.

## Security Checklist - Deployment

For production deployment, see [HTTPS_SECURITY.md](HTTPS_SECURITY.md) for detailed setup instructions:
- [ ] Obtain SSL certificates (Let's Encrypt recommended)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `HTTPS_CERT_PATH` and `HTTPS_KEY_PATH`
- [ ] Set `FRONTEND_URLS` to specific allowed origins (no wildcards)
- [ ] Rotate SSL certificates before expiration
- [ ] Monitor request logs for suspicious activity
- [ ] Use reverse proxy (Nginx) for additional security layer

## DI / Static Values Status

- **DI used:** Yes (repositories/services/controllers are injected composition-style via `data/repositoryFactory.js`).
- **Static values centralized:** Yes (HTTP status codes, API paths, and response helper patterns centralized).
- **Validation + error codes:** Yes (request validators and consistent HTTP error status usage added).
- **DB save logic decoupled:** Yes (provider-based repositories; switching DB mainly requires implementing provider adapters).

## Notes

- Ensure PostgreSQL database exists and schema is applied before calling `/api/v1/*`.
- Legacy mock auth/events endpoints still exist for backward compatibility with current frontend flow.

## Flow Architecture (End-to-End)

```text
Client Request
  -> Express App
    -> CORS + Body Parser
    -> requestLogger middleware (trace_id start + timer start)
    -> Route
      -> Validator middleware (payload/id checks)
      -> Controller
        -> Service (business logic)
          -> Repository Interface (provider-agnostic)
            -> DB Provider Adapter (postgres or mongo)
              -> Actual DB
        <- Repository result
      <- Service output
    <- Controller response
    -> requestLogger finish hook (duration + response capture)
       -> JSON console log
       -> async DB log insert (api_request_logs)

If any error occurs:
  -> errorHandler
    -> standardized error response with code + traceId
    -> JSON error console log
    -> async DB error insert (api_error_logs)
```

