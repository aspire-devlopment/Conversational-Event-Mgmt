// Repository Factory: Provides database-agnostic repository instances
// This module enables decoupling of business logic from specific database implementations.
// Uses PostgreSQL as the default database provider with data context pattern for DB independence.

/**
 * File: repositoryFactory.js
 * Purpose: Repository factory for dependency injection
 * Description: Factory function that creates all repository instances
 *              with a PostgreSQL data context.
 *              Enables database-agnostic repositories through data context abstraction.
 */

const createPostgresRepositories = require('./providers/postgres');
const PostgresDataContext = require('./dataContexts/postgresDataContext');

// Creates repositories with PostgreSQL data context.
// Data context abstracts DB operations, allowing repositories to be DB-agnostic.
const createRepositories = () => {
  const dataContext = new PostgresDataContext();
  return createPostgresRepositories(dataContext);
};

module.exports = createRepositories;

