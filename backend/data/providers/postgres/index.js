// PostgreSQL Repository Provider
// This module creates concrete repository instances for PostgreSQL database.
// Each repository handles CRUD operations for a specific table/entity.
// Uses the Data Context for database operations, making repositories DB-independent.

/**
 * File: postgres/index.js
 * Purpose: PostgreSQL repository provider
 * Description: Creates concrete repository instances for PostgreSQL:
 *              UserRepository, RoleRepository, EventRepository,
 *              ChatSessionRepository, EventRoleRepository, LogRepository.
 *              Injects PostgreSQL data context into each repository.
 */

const UserRepository = require('../../../repositories/userRepository');
const RoleRepository = require('../../../repositories/roleRepository');
const EventRepository = require('../../../repositories/eventRepository');
const ChatSessionRepository = require('../../../repositories/chatSessionRepository');
const EventRoleRepository = require('../../../repositories/eventRoleRepository');
const LogRepository = require('../../../repositories/logRepository');
const IdempotencyRepository = require('../../../repositories/idempotencyRepository');

// Factory function to create all repository instances with a Data Context.
// The Data Context abstracts DB operations, allowing repositories to be DB-agnostic.
// Returns an object with all repositories injected with the data context.
const createPostgresRepositories = (dataContext) => ({
  userRepository: new UserRepository(dataContext),
  roleRepository: new RoleRepository(dataContext),
  eventRepository: new EventRepository(dataContext),
  chatSessionRepository: new ChatSessionRepository(dataContext),
  eventRoleRepository: new EventRoleRepository(dataContext),
  logRepository: new LogRepository(dataContext),
  idempotencyRepository: new IdempotencyRepository(dataContext),
});

module.exports = createPostgresRepositories;

