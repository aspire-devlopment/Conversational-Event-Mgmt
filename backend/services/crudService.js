/**
 * File: crudService.js
 * Purpose: Generic CRUD service for database operations
 * Description: Reusable service class that wraps any repository to provide
 *              standard CRUD operations: list(), getById(), create(), update(), remove().
 *              Eliminates duplication for all entity types (users, roles, events, etc.).
 */

class CrudService {
  constructor(repository) {
    this.repository = repository;
  }

  list() {
    return this.repository.list();
  }

  getById(id) {
    return this.repository.getById(id);
  }

  create(payload) {
    return this.repository.create(payload);
  }

  update(id, payload) {
    return this.repository.update(id, payload);
  }

  remove(id) {
    return this.repository.remove(id);
  }
}

module.exports = CrudService;

