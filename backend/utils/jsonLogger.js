/**
 * File: jsonLogger.js
 * Purpose: JSON-formatted logging with redaction.
 * Description: Builds structured log entries for console/file output and removes
 *              sensitive values before anything is written.
 */
const util = require('util');
const fileLogger = require('./fileLogger');

// Recursively replace sensitive fields before logs are printed or written.
const redactSensitive = (value) => {
  if (!value || typeof value !== 'object') return value;

  const sensitiveKeys = [
    'password',
    'password_hash',
    'token',
    'authorization',
    'api_key',
    'apikey',
    'access_token',
    'refresh_token',
    'secret',
    'key',
  ];
  const clone = Array.isArray(value) ? [...value] : { ...value };

  Object.keys(clone).forEach((key) => {
    const raw = clone[key];
    if (sensitiveKeys.includes(key.toLowerCase())) {
      clone[key] = '[REDACTED]';
      return;
    }
    if (raw && typeof raw === 'object') {
      clone[key] = redactSensitive(raw);
    }
  });

  return clone;
};

// JSON stringify safely, falling back to util.inspect when circular data appears.
const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({
      serialization_error: error.message,
      fallback: util.inspect(value, { depth: 4, breakLength: 120 }),
    });
  }
};

// Build a structured log entry and send it to console plus daily file logs.
const logJson = (level, payload) => {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const sanitizedEntry = redactSensitive(entry);
  console.log(safeStringify(sanitizedEntry));
  fileLogger.log(level, sanitizedEntry);
};

module.exports = {
  redactSensitive,
  logJson,
};

