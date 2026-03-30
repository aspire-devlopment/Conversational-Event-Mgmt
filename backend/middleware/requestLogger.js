// Request Logger Middleware Factory
// Purpose: Logs all HTTP requests with detailed metrics for auditing and debugging.
// This middleware:
//   1. Generates a unique trace ID for each request (UUID) for correlation
//   2. Measures request processing time with nanosecond precision
//   3. Captures request metadata (method, path, IP, user-agent)
//   4. Intercepts response body before it's sent to client
//   5. Logs request details to console in JSON format with sensitive data redacted
//   6. Writes request logs to the configured text log file via jsonLogger/fileLogger
// How it works:
//   1. Records start time using high-resolution clock (process.hrtime)
//   2. Generates trace ID and attaches to request object
//   3. Overrides res.json() to capture response body
//   4. On response finish, calculates duration and logs all metrics
//   5. Request/response body is redacted to remove passwords, tokens, etc.
// Usage: Applied to all routes automatically in Express app

const createRequestLogger = (loggingService) => (req, res, next) => {
  const startNs = process.hrtime.bigint();
  const traceId = loggingService.createTraceId();
  req.traceId = traceId;

  const safeRequestBody = loggingService.safePayload(req.body);

  const originalJson = res.json.bind(res);
  res.locals.responseBody = null;
  res.json = (body) => {
    res.locals.responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const endNs = process.hrtime.bigint();
    const durationMs = Number(endNs - startNs) / 1e6;

    const payload = {
      trace_id: traceId,
      method: req.method,
      path: req.originalUrl,
      status_code: res.statusCode,
      duration_ms: Number(durationMs.toFixed(2)),
      ip_address: req.ip,
      user_agent: req.get('user-agent') || null,
      request_body: safeRequestBody,
      response_body: loggingService.safePayload(res.locals.responseBody || {}),
    };

    loggingService.logRequestConsole(payload);
  });

  next();
};

module.exports = createRequestLogger;

