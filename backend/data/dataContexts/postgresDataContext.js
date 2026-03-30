// PostgreSQL Data Context
// This class provides a database-agnostic interface for executing queries.
// It wraps the PostgreSQL pool and provides methods for query execution.
// This allows repositories to be independent of the specific DB implementation.

/**
 * File: postgresDataContext.js
 * Purpose: PostgreSQL database abstraction context
 * Description: Wraps pg connection pool and provides database abstraction:
 *              query() - execute SELECT queries with parameters,
 *              execute() - execute INSERT/UPDATE/DELETE commands.
 *              Enables repositories to be database-agnostic.
 */

const pool = require('../../db/pool');

class PostgresDataContext {
  constructor() {
    this.pool = pool;
  }

  // Executes a SELECT query and returns rows
  async query(sql, params = []) {
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  // Executes an INSERT, UPDATE, or DELETE query and returns rowCount or rows
  async execute(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result;
  }

  async withTransaction(work) {
    const client = await this.pool.connect();

    const tx = {
      query: (sql, params = []) => client.query(sql, params).then((result) => result.rows),
      execute: (sql, params = []) => client.query(sql, params),
    };

    try {
      await client.query('BEGIN');
      const result = await work(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresDataContext;
