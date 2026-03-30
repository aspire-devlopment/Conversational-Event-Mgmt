/**
 * File: fileLogger.js
 * Purpose: Daily file-based logging system
 * Description: Logs API events to daily rotating log files:
 *              Creates logs directory automatically,
 *              Rotates logs daily with YYYY-MM-DD.log naming,
 *              Appends JSON-formatted entries throughout the day.
 *              Used for audit trails and debugging.
 */

const fs = require('fs');
const path = require('path');

class FileLogger {
  constructor(logsDir = 'logs') {
    this.logsDir = path.join(__dirname, '..', logsDir);
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log(`[FileLogger] Created logs directory at: ${this.logsDir}`);
    }
  }

  getLogFilePath() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `${today}.log`);
  }

  writeLog(level, payload) {
    try {
      const logFilePath = this.getLogFilePath();
      const logEntry = JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        ...payload,
      }) + '\n';

      fs.appendFileSync(logFilePath, logEntry, 'utf8');
    } catch (error) {
      console.error('[FileLogger] Failed to write log file:', error.message);
    }
  }

  log(level, payload) {
    this.writeLog(level, payload);
  }

  info(payload) {
    this.writeLog('info', payload);
  }

  error(payload) {
    this.writeLog('error', payload);
  }

  warn(payload) {
    this.writeLog('warn', payload);
  }

  debug(payload) {
    this.writeLog('debug', payload);
  }
}

module.exports = new FileLogger();
