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
  // Configure the log directory and create it if needed.
  constructor(logsDir = 'logs') {
    this.logsDir = path.join(__dirname, '..', logsDir);
    this.ensureLogsDirectory();
  }

  // Ensure the folder for daily log files exists.
  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log(`[FileLogger] Created logs directory at: ${this.logsDir}`);
    }
  }

  // Build the path for today's YYYY-MM-DD log file.
  getLogFilePath() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `${today}.log`);
  }

  // Append one JSON log entry to today's log file.
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

  // Generic log method used by the structured logger wrapper.
  log(level, payload) {
    this.writeLog(level, payload);
  }

  // Write an informational log entry.
  info(payload) {
    this.writeLog('info', payload);
  }

  // Write an error log entry.
  error(payload) {
    this.writeLog('error', payload);
  }

  // Write a warning log entry.
  warn(payload) {
    this.writeLog('warn', payload);
  }

  // Write a debug log entry.
  debug(payload) {
    this.writeLog('debug', payload);
  }
}

module.exports = new FileLogger();
