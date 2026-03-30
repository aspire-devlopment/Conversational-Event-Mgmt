/**
 * File: roleRepository.js
 * Purpose: Role data access layer
 * Description: Repository class for role database operations:
 *              CRUD operations (list, getById, create, update, remove).
 *              Manages user roles (Manager, Sales Rep, Viewer, etc.).
 */

class RoleRepository {
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  async list() {
    const rows = await this.dataContext.query('SELECT id, name FROM roles ORDER BY id');
    return rows;
  }

  async getById(id) {
    const rows = await this.dataContext.query('SELECT id, name FROM roles WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async create(name) {
    const rows = await this.dataContext.query(
      'INSERT INTO roles (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    return rows[0];
  }

  async update(id, name) {
    const rows = await this.dataContext.query(
      'UPDATE roles SET name = $2 WHERE id = $1 RETURNING id, name',
      [id, name]
    );
    return rows[0] || null;
  }

  async remove(id) {
    const result = await this.dataContext.execute('DELETE FROM roles WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}

module.exports = RoleRepository;

