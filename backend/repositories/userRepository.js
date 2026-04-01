/**
 * File: userRepository.js
 * Purpose: User data access layer
 * Description: Repository class for user database operations:
 *              CRUD operations (list, getById, create, update, remove),
 *              findByEmail() - lookup user by email address (case-insensitive).
 *              Abstracts database queries using data context pattern.
 */

class UserRepository {
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  baseSelectSql() {
    return `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.contact_number,
        u.role_id,
        r.name AS role,
        u.password_hash,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
    `;
  }

  async list() {
    const q = `
      ${this.baseSelectSql()}
      ORDER BY u.id DESC
    `;
    return this.dataContext.query(q);
  }

  async getById(id) {
    const q = `
      ${this.baseSelectSql()}
      WHERE u.id = $1
    `;
    const rows = await this.dataContext.query(q, [id]);
    return rows[0] || null;
  }

  async create(payload) {
    const q = `
      INSERT INTO users (first_name, last_name, email, contact_number, password_hash, role_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const values = [
      payload.first_name,
      payload.last_name || null,
      payload.email,
      payload.contact_number || null,
      payload.password_hash || null,
      payload.role_id || null,
    ];
    const rows = await this.dataContext.query(q, values);
    const insertedId = rows[0]?.id;
    if (!insertedId) return null;
    return this.getById(insertedId);
  }

  async update(id, payload) {
    const q = `
      WITH updated AS (
        UPDATE users u
        SET first_name = COALESCE($2, u.first_name),
            last_name = COALESCE($3, u.last_name),
            email = COALESCE($4, u.email),
            contact_number = COALESCE($5, u.contact_number),
            password_hash = COALESCE($6, u.password_hash),
            role_id = COALESCE((SELECT id FROM roles WHERE name = $7), u.role_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE u.id = $1
        RETURNING id
      )
      ${this.baseSelectSql()}
      WHERE u.id = (SELECT id FROM updated)
    `;
    const values = [
      id,
      payload.first_name,
      payload.last_name,
      payload.email,
      payload.contact_number,
      payload.password_hash,
      payload.role,
    ];
    const rows = await this.dataContext.query(q, values);
    return rows[0] || null;
  }

  async remove(id) {
    const result = await this.dataContext.execute('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async findByEmail(email) {
    /**
     * Find user by email address
     * @param {string} email - Email address to search for
     * @returns {object|null} - User object if found, null otherwise
     */
    const q = `
      ${this.baseSelectSql()}
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `;
    const rows = await this.dataContext.query(q, [email]);
    return rows[0] || null;
  }
}

module.exports = UserRepository;

