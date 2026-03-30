# Logging Approach

## 1. Overview

This project uses a structured logging approach to support debugging, auditing, performance monitoring, and production issue tracing. The logging design was implemented in a layered way so that different kinds of information are captured in the most appropriate place:

- API requests and responses are logged in structured JSON format
- request duration is measured for each API call
- application errors are logged to both files and the database
- sensitive fields are redacted before log entries are written
- a unique trace ID is attached to each request so related logs can be correlated

The overall goal was to make the system easier to observe without exposing sensitive data.

---

## 2. Logging Layers Used in the Project

The logging implementation is split across several backend components:

- [`backend/middleware/requestLogger.js`](/e:/AI-Conversational/backend/middleware/requestLogger.js)
- [`backend/services/loggingService.js`](/e:/AI-Conversational/backend/services/loggingService.js)
- [`backend/utils/jsonLogger.js`](/e:/AI-Conversational/backend/utils/jsonLogger.js)
- [`backend/utils/fileLogger.js`](/e:/AI-Conversational/backend/utils/fileLogger.js)
- [`backend/middleware/errorHandler.js`](/e:/AI-Conversational/backend/middleware/errorHandler.js)
- [`backend/repositories/logRepository.js`](/e:/AI-Conversational/backend/repositories/logRepository.js)

Each part has a different responsibility, which helps keep the implementation decoupled and easier to maintain.

---

## 3. Request Logging Approach

All incoming HTTP requests pass through a request logging middleware. This middleware captures the request at the application boundary and records useful runtime details.

### What is captured

For each request, the system logs:

- HTTP method
- request path
- response status code
- execution time in milliseconds
- IP address
- user agent
- request body
- response body
- trace ID

### How it works

The middleware in [`backend/middleware/requestLogger.js`](/e:/AI-Conversational/backend/middleware/requestLogger.js) performs the following steps:

1. generate a unique trace ID
2. attach that trace ID to the request object
3. record the high-resolution start time
4. intercept `res.json()` so the response payload can be captured
5. wait for the response to finish
6. calculate the total request duration
7. send the structured payload to the logging service

This approach makes the logs useful not only for debugging failures, but also for reviewing normal system behavior and API performance.

---

## 4. API Timing and Performance Visibility

One important part of the logging design is request timing. The middleware uses `process.hrtime.bigint()` to measure the duration of each request with good precision.

This is useful because it helps identify:

- slow endpoints
- expensive database operations
- long-running AI requests
- abnormal delays during event creation or chat interaction

By storing `duration_ms` in each request log, the system provides basic performance observability without requiring a separate monitoring platform.

---

## 5. Structured JSON Logging

The project uses structured JSON logging rather than free-form text messages. This is implemented in [`backend/utils/jsonLogger.js`](/e:/AI-Conversational/backend/utils/jsonLogger.js).

### Why JSON logging was chosen

JSON logging was chosen because it is:

- easier to search and filter
- easier to parse programmatically
- more consistent across environments
- better suited for debugging distributed or multi-step flows
- useful for future log aggregation tools

### Logged structure

Each log entry includes fields such as:

- `level`
- `timestamp`
- `type`
- `trace_id`
- request metadata
- safe versions of request and response data

Because the logs are structured, it is much easier to correlate frontend actions with backend operations.

---

## 6. File Logging Approach

In addition to console logging, the project writes logs to daily rotating files through [`backend/utils/fileLogger.js`](/e:/AI-Conversational/backend/utils/fileLogger.js).

### File logging behavior

- logs are stored in the backend `logs/` directory
- each day gets its own file, named as `YYYY-MM-DD.log`
- log entries are appended as one JSON object per line

### Why file logging was added

File logging was included because it provides:

- a simple local audit trail
- persistence across terminal restarts
- easier debugging for development and demo environments
- a historical record of API activity

This is especially useful for a project where both chat and event workflows may need to be reviewed after an issue occurs.

---

## 7. Error Logging Approach

Errors are handled centrally in [`backend/middleware/errorHandler.js`](/e:/AI-Conversational/backend/middleware/errorHandler.js).

### What happens when an error occurs

When an error is thrown in a route or service:

1. the error handler determines the HTTP status code
2. it builds a structured error payload
3. it logs the error in JSON form
4. it attempts to persist the error into the database
5. it returns a consistent JSON error response to the client

### Error fields captured

The system records:

- trace ID
- method
- path
- status code
- error message
- error stack in development mode
- redacted request body

This makes it possible to connect a failed request with the exact request log that produced it.

---

## 8. Database Error Log Persistence

The project stores application errors in the `error_logs` table through [`backend/repositories/logRepository.js`](/e:/AI-Conversational/backend/repositories/logRepository.js).

### Why error logs are stored in the database

Database persistence was chosen for error logs because it supports:

- auditing
- long-term troubleshooting
- querying error history
- reviewing failure patterns by endpoint
- preserving critical errors beyond local terminal sessions

### Important design decision

Only error logs are persisted to the database. Normal request logs are written to JSON log files instead.

This is a sensible balance because:

- request logs can become very large
- file logs are sufficient for normal traffic review
- database storage is reserved for more important error events

---

## 9. Sensitive Data Redaction

The project includes built-in protection for sensitive values before logging. This is implemented by `redactSensitive()` in [`backend/utils/jsonLogger.js`](/e:/AI-Conversational/backend/utils/jsonLogger.js).

### Redacted fields

The logger redacts values for keys such as:

- `password`
- `password_hash`
- `token`
- `authorization`
- `api_key`
- `access_token`
- `refresh_token`
- `secret`
- `key`

These values are replaced with `[REDACTED]`.

### Why this matters

This is an important security measure because logs should be useful for debugging without leaking credentials, tokens, or secret keys.

---

## 10. Trace ID Correlation

Each request is assigned a unique trace ID using `randomUUID()` in [`backend/services/loggingService.js`](/e:/AI-Conversational/backend/services/loggingService.js).

### Why trace IDs are important

Trace IDs make it possible to connect:

- request logs
- error logs
- client error responses
- backend debugging activity

This is especially helpful in multi-step flows such as:

- chat message processing
- event creation
- event update
- authentication failures

If a client receives an error response containing a `traceId`, the same identifier can be searched in the logs and database to find the full request history.

---

## 11. Process-Level Error Logging

The server also logs process-level failures in [`backend/server.js`](/e:/AI-Conversational/backend/server.js).

These include:

- unhandled promise rejections
- uncaught exceptions

These errors are written to console as structured JSON. This provides a last line of visibility for failures that happen outside the normal request-response cycle.

---

## 12. Relation with Idempotency and Error Handling

The logging approach also works alongside the idempotency implementation.

When an error occurs during an idempotent request:

- the error is logged
- the request response is standardized
- the idempotency record is completed with the failure response

This keeps the system behavior consistent and makes repeated API submissions easier to debug.

---

## 13. Why This Logging Approach Was Chosen

This approach was selected because it balances simplicity and practical observability.

### Main reasons

- it is easy to run locally without external infrastructure
- it provides structured logs for debugging and review
- it captures both request data and application errors
- it protects sensitive values through redaction
- it supports traceability with request IDs
- it gives both file-based and database-based visibility

For a project of this size, this is a strong middle ground between minimal console logging and a full enterprise observability platform.

---

## 14. Benefits for This Project

The logging approach is particularly useful for this chat-based event system because it helps track:

- authentication issues
- AI/chat request behavior
- event creation and update payloads
- duplicate event validation behavior
- API timing
- backend runtime failures

This is valuable during development, testing, and demo preparation.

---

## 15. Limitations

The current logging implementation is effective, but it has a few limitations:

- normal request logs are file-based only and are not stored in the database
- there is no external log aggregation service
- there are no dashboards or alerting rules
- log retention is not yet automated
- file rotation is daily, but archival and cleanup are not yet implemented

These limitations are acceptable for the current project scope, but could be improved in a future production deployment.

---

## 16. Future Improvements

Possible future enhancements include:

- centralized log aggregation using tools such as ELK or Grafana Loki
- log retention and cleanup policies
- searchable admin log dashboards
- alerting for repeated failures or slow endpoints
- separate audit logs for security-sensitive admin actions
- richer AI request diagnostics for model failures and fallback behavior

---

## 17. Summary

The project uses a hybrid logging approach:

- structured JSON logging for consistency
- file-based logging for day-to-day request history
- database logging for error persistence
- trace IDs for correlation
- redaction for security
- request timing for visibility into performance

This design improves maintainability, helps diagnose issues faster, and supports the project’s security and debugging needs without adding unnecessary infrastructure complexity.
