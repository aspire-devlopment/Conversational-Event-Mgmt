const { logJson } = require('./jsonLogger');

/**
 * File: logger.js
 * Purpose: Central logger wrapper for the application
 * Description: Provides a unified logging interface supporting structured JSON logging
 *              with automatic sensitive data redaction. Used across controllers, services,
 *              and repositories for consistent logging practices.
 */

const createLogger = (level) => {
  return (source = 'app', message = '', data = {}) => {
    const payload = {
      source,
      message,
      ...data
    };
    logJson(level, payload);
  };
};

module.exports = {
  info: createLogger('INFO'),
  error: createLogger('ERROR'),
  warn: createLogger('WARN'),
  debug: createLogger('DEBUG'),
};
