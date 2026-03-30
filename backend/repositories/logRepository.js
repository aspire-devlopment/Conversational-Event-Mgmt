/**
 * File: logRepository.js
 * Purpose: API request logs data access layer
 * Description: Repository class for logging database operations.
 *              Persists API error logs to the database for debugging and auditing.
 */

class LogRepository {
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  async saveErrorLog(payload) {
    const q = `
      INSERT INTO error_logs (
        trace_id, method, path, status_code, error_message, error_stack,
        request_body, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,CURRENT_TIMESTAMP)
    `;

    await this.dataContext.execute(q, [
      payload.trace_id,
      payload.method,
      payload.path,
      payload.status_code,
      payload.error_message,
      payload.error_stack || null,
      JSON.stringify(payload.request_body || {}),
    ]);
  }
}

module.exports = LogRepository;

