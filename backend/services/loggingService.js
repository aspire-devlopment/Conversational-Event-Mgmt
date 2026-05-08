/**
 * File: loggingService.js
 * Purpose: Centralized logging service
 * Description: Service for application logging.
 *              Request/response logs go to structured text logs.
 *              Error logs are persisted to database for auditing and debugging.
 */
const { randomUUID } = require('crypto');
const { logJson, redactSensitive } = require('../utils/jsonLogger');

class LoggingService {
  constructor(logRepository) {
    this.logRepository = logRepository;
  }

  createTraceId() {
    return randomUUID();
  }

  safePayload(payload) {
    return redactSensitive(payload || {});
  }

  logRequestConsole(payload) {
    logJson('info', { type: 'api_request', ...payload });
  }

  logErrorConsole(payload) {
    logJson('error', { type: 'api_error', ...payload });
  }

  /**
   * Convenience logger: info
   * @param {string} context - Source/context of the log
   * @param {string} message - Human readable message
   * @param {object} meta - Additional metadata
   */
  info(context, message, meta = {}) {
    logJson('info', { context, message, ...this.safePayload(meta) });
  }

  /**
   * Convenience logger: error
   * Persists error logs to repository as well as writing to console
   */
  async error(context, message, meta = {}) {
    const payload = { context, message, ...this.safePayload(meta), timestamp: new Date().toISOString() };
    this.logErrorConsole(payload);
    try {
      await this.persistErrorLog(payload);
    } catch (e) {
      // swallow
    }
  }

  /**
   * Convenience logger: warn
   */
  warn(context, message, meta = {}) {
    logJson('warn', { context, message, ...this.safePayload(meta) });
  }

  /**
   * Convenience logger: debug
   */
  debug(context, message, meta = {}) {
    logJson('debug', { context, message, ...this.safePayload(meta) });
  }

  async persistErrorLog(payload) {
    try {
      // Allow disabling DB/error-log persistence for debugging environments
      if (process.env.DISABLE_DB_LOGS === 'true') {
        logJson('warn', { type: 'error_log_persist_skipped', reason: 'DISABLE_DB_LOGS=true' });
        return;
      }
      if (!this.logRepository || !this.logRepository.saveErrorLog) {
        logJson('warn', { type: 'error_log_persist_failed', reason: 'logRepository not available' });
        return;
      }

      // Map generic payload to repository schema
      const record = {
        trace_id: payload.trace_id || this.createTraceId(),
        method: payload.method || null,
        path: payload.path || null,
        status_code: payload.status_code || null,
        // Ensure error_message is a string and not null to satisfy DB constraints
        error_message:
          (typeof payload.message === 'string' && payload.message) ||
          (payload.message && JSON.stringify(payload.message)) ||
          (payload.error && (payload.error.message || String(payload.error))) ||
          'Unknown error',
        error_stack: (payload.error && payload.error.stack) || payload.error_stack || null,
        request_body: payload.request_body || {},
      };

      await this.logRepository.saveErrorLog(record);
    } catch (error) {
      logJson('warn', {
        type: 'error_log_persist_failed',
        reason: error.message,
      });
    }
  }

  /**
   * Set or replace the underlying log repository
   * @param {object} repo
   */
  setRepository(repo) {
    this.logRepository = repo;
  }
}

// Export a singleton instance for convenience across modules
const loggingServiceInstance = new LoggingService();
loggingServiceInstance.LoggingServiceClass = LoggingService;
module.exports = loggingServiceInstance;

