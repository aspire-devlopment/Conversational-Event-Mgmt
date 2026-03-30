const { randomUUID } = require('crypto');
const { logJson, redactSensitive } = require('../utils/jsonLogger');

/**
 * File: loggingService.js
 * Purpose: Centralized logging service
 * Description: Service for application logging.
 *              Request/response logs go to structured text logs.
 *              Error logs are persisted to database for auditing and debugging.
 */

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

  async persistErrorLog(payload) {
    try {
      await this.logRepository.saveErrorLog(payload);
    } catch (error) {
      logJson('warn', {
        type: 'error_log_persist_failed',
        reason: error.message,
      });
    }
  }
}

module.exports = LoggingService;

