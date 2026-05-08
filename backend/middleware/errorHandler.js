// Error Handler Middleware
// Purpose: Centralized error handling for the entire application.
// This middleware:
//   1. Catches all errors from route handlers and other middleware
//   2. Logs errors to console with sensitive data redacted (passwords, tokens, etc.)
//   3. Persists errors to the database for auditing and debugging
//   4. Returns standardized JSON error responses to clients
//   5. Hides stack traces from clients in production (security)
//   6. Includes trace ID for error correlation with request logs
// How it works:
//   1. Extracts status code and message from error object
//   2. Creates error payload with redacted request body
//   3. Logs error both to console and database via loggingService
//   4. Sends HTTP response with error details and trace ID
// Note: Must be registered as the LAST middleware in Express app

/**
 * File: errorHandler.js
 * Purpose: Global error handling middleware
 * Description: Catches all errors thrown in async route handlers and return
 *              consistent error responses with HTTP status codes and messages.
 *              Should be the last middleware registered in server.js.
 */

const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const { logJson, redactSensitive } = require('../utils/jsonLogger');

// Convert thrown errors into logged, standardized HTTP error responses.
const errorHandler = (err, req, res, next) => {
  console.error('[errorHandler] ERROR CAUGHT:', { message: err.message, stack: err.stack });
  // Normalize certain low-level driver/auth errors to friendly client errors
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || MESSAGES.COMMON.INTERNAL_SERVER_ERROR;

  // Common PostgreSQL / SASL errors when a non-string password is provided
  // Map them to 400 Bad Request to avoid leaking low-level messages.
  const lowered = String(message).toLowerCase();
  if (
    lowered.includes('client password must be a string') ||
    lowered.includes('sasl: scram-server-first-message') ||
    lowered.includes('invalid first arg') && lowered.includes('password')
  ) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Password must be a string';
  }
  const traceId = req.traceId || null;

  const errorPayload = {
    trace_id: traceId,
    method: req.method,
    path: req.originalUrl,
    status_code: statusCode,
    error_message: message,
    error_stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    request_body: redactSensitive(req.body || {}),
  };

  if (req.loggingService) {
    req.loggingService.logErrorConsole(errorPayload);
    void req.loggingService.persistErrorLog(errorPayload);
  } else {
    logJson('error', { type: 'api_error', ...errorPayload });
  }

  if (req.idempotencyContext?.id && req.idempotencyRepository) {
    void req.idempotencyRepository.completeRequest(
      req.idempotencyContext.id,
      statusCode,
      {
        status: 'error',
        message,
        code: statusCode,
        traceId,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      }
    );
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    code: statusCode,
    traceId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
