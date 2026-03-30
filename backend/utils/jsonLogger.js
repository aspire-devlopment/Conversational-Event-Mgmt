const util = require('util');
const fileLogger = require('./fileLogger');

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

/**
 * File: jsonLogger.js
 * Purpose: JSON-formatted console logging
 * Description: Utility for structured JSON logging to console:
 *              logJson() - output data as JSON with timestamp and level.
 *              Used for request logging, error tracking, and debugging.
 */

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

