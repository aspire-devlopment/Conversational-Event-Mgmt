/**
 * File: crudService.js
 * Purpose: Generic CRUD service for database operations
 * Description: Reusable service class that wraps any repository to provide
 *              standard CRUD operations: list(), getById(), create(), update(), remove().
 *              Eliminates duplication for all entity types (users, roles, events, etc.).
 */

class CrudService {
  // Store any repository that follows the standard CRUD method contract.
  constructor(repository) {
    this.repository = repository;
  }

  // Return all records from the wrapped repository.
  list() {
    return this.repository.list();
  }

  // Return one record by id from the wrapped repository.
  getById(id) {
    return this.repository.getById(id);
  }

  // Create a new record through the wrapped repository.
  create(payload) {
    return this.repository.create(payload);
  }

  // Update a record through the wrapped repository.
  update(id, payload) {
    return this.repository.update(id, payload);
  }

  // Delete a record through the wrapped repository.
  remove(id) {
    return this.repository.remove(id);
  }
}

module.exports = CrudService;

