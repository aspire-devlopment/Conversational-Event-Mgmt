/**
 * File: pool.js
 * Purpose: PostgreSQL connection pool
 * Description: Creates and manages PostgreSQL connection pool using pg library.
 *              Handles database connection from environment variables.
 *              Provides single pool instance for entire application.
 *              Connection reuse for improved performance.
 */

// Load environment variables first, before creating the pool
// This ensures DB_PASSWORD and other env vars are available regardless of when this module is required
require('../config/env');

const { Pool } = require('pg');

const shouldUseSsl =
  process.env.DB_SSL === 'true' ||
  process.env.DB_SSLMODE === 'require' ||
  process.env.NODE_ENV === 'production';

// Debug: log the type of DB_PASSWORD to catch non-string values (avoid printing the secret)
try {
  const pwd = process.env.DB_PASSWORD;
  const type = pwd === undefined ? 'undefined' : typeof pwd;
  const len = pwd && typeof pwd === 'string' ? pwd.length : (pwd ? 'unknown' : 0);
  console.debug(`[DB] DB_PASSWORD type=${type} length=${len}`);
} catch (e) {
  // ignore
}
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  // Ensure password is always a string (some environments can pass non-string values)
  password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
  database: process.env.DB_NAME || 'event_management',
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS || 5000),
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
});

// Log the actual credentials being used (WITHOUT the password for security)
console.log('[DB Pool Config]', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  passwordSet: !!process.env.DB_PASSWORD,
  passwordType: typeof process.env.DB_PASSWORD,
  passwordLength: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD).length : 0,
  redisHost: process.env.REDIS_HOST,
  redisPassword: process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET',
});

// Add error listener to catch SASL/auth errors before they bubble up
pool.on('error', (err) => {
  console.error('[POOL ERROR]', err.message);
  // Log pool config (without password) to debug
  console.error('[POOL CONFIG]', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    passwordType: typeof process.env.DB_PASSWORD,
    passwordLength: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD).length : 'null',
  });
});

module.exports = pool;
