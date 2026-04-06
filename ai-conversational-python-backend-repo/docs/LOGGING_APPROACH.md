# Python Backend Logging Approach

## Overview

The Python backend uses structured logging to support debugging, auditing, performance monitoring, and production issue tracing.

## Main Features

- request and response logging in JSON
- request duration tracking
- trace ID correlation
- sensitive field redaction
- date-wise log storage in a separate folder
- application error persistence to the `error_logs` table

## Key Files

- [logging.py](/e:/AI-Conversational/python_backend/app/core/logging.py)
- [request_context.py](/e:/AI-Conversational/python_backend/app/presentation/middleware/request_context.py)
- [auth_context.py](/e:/AI-Conversational/python_backend/app/presentation/middleware/auth_context.py)
- [main.py](/e:/AI-Conversational/python_backend/app/main.py)
- [log_repository.py](/e:/AI-Conversational/python_backend/app/infrastructure/repositories/log_repository.py)

## File Storage

Logs are written by date:

```text
python_backend/logs/YYYY-MM-DD/application.log
python_backend/logs/YYYY-MM-DD/error.log
```

## Database Error Logging

High-value application errors are also persisted into:

- `error_logs`

This supports auditing and historical troubleshooting without storing routine request traffic in the database.

## Redaction

Sensitive keys such as `password`, `token`, `authorization`, `api_key`, and related secret fields are redacted before log serialization.

## Reference

Detailed version:

- [PYTHON_BACKEND_LOGGING_APPROACH.md](/e:/AI-Conversational/Documents/PYTHON_BACKEND_LOGGING_APPROACH.md)
