/**
 * File: pool.js
 * Purpose: PostgreSQL connection pool
 * Description: Creates and manages PostgreSQL connection pool using pg library.
 *              Handles database connection from environment variables.
 *              Provides single pool instance for entire application.
 *              Connection reuse for improved performance.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'event_management',
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS || 5000),
});

module.exports = pool;

