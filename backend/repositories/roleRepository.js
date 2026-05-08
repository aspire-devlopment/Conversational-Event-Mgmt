/**
 * File: roleRepository.js
 * Purpose: Role data access layer
 * Description: Repository class for role database operations:
 *              CRUD operations (list, getById, create, update, remove).
 *              Manages user roles (Manager, Sales Rep, Viewer, etc.).
 */

class RoleRepository {
  // Store the database context used for role queries.
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  // Return every role in stable ID order for forms and admin screens.
  async list() {
    const rows = await this.dataContext.query('SELECT id, name FROM roles ORDER BY id');
    return rows;
  }

  // Return one role by id, or null when it does not exist.
  async getById(id) {
    const rows = await this.dataContext.query('SELECT id, name FROM roles WHERE id = $1', [id]);
    return rows[0] || null;
  }

  // Insert a new role name and return the created row.
  async create(name) {
    const rows = await this.dataContext.query(
      'INSERT INTO roles (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    return rows[0];
  }

  // Rename an existing role and return the updated row.
  async update(id, name) {
    const rows = await this.dataContext.query(
      'UPDATE roles SET name = $2 WHERE id = $1 RETURNING id, name',
      [id, name]
    );
    return rows[0] || null;
  }

  // Delete a role and return whether a row was removed.
  async remove(id) {
    const result = await this.dataContext.execute('DELETE FROM roles WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}

module.exports = RoleRepository;

