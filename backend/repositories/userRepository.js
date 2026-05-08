/**
 * File: userRepository.js
 * Purpose: User data access layer
 * Description: Repository class for user database operations:
 *              CRUD operations (list, getById, create, update, remove),
 *              findByEmail() - lookup user by email address (case-insensitive).
 *              Abstracts database queries using data context pattern.
 */

class UserRepository {
  // Store the database context used for users and their joined role data.
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  // Build the shared SELECT query used by list/get/find operations.
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

  // Return all users with role names, newest users first.
  async list() {
    const q = `
      ${this.baseSelectSql()}
      ORDER BY u.id DESC
    `;
    return this.dataContext.query(q);
  }

  // Return one user by primary key, or null when it does not exist.
  async getById(id) {
    const q = `
      ${this.baseSelectSql()}
      WHERE u.id = $1
    `;
    const rows = await this.dataContext.query(q, [id]);
    return rows[0] || null;
  }

  // Insert a user row, then reload it with its role name attached.
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

  // Partially update a user and resolve a role name to role_id when provided.
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

  // Delete one user by id and return whether a row was removed.
  async remove(id) {
    const result = await this.dataContext.execute('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  // Find a user by email address for login and duplicate-account checks.
  async findByEmail(email) {
    const q = `
      ${this.baseSelectSql()}
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `;
    const rows = await this.dataContext.query(q, [email]);
    return rows[0] || null;
  }

  /**
   * Get all users for specified role names
   * Purpose: Retrieve users who should be notified for event creation
   * Used by: notificationService to find users for email notifications
   *
   * Query Logic:
   * - Joins users with roles table
   * - Filters by role name (case-insensitive)
   * - Returns all matching users with role information
   * - Used for role-based notifications after event creation
   *
   * @param {array} roleNames - Array of role names ['Admin', 'Manager', 'Sales Rep']
   * @returns {Promise<array>} Array of user objects with role information
   *   Each user: { id, first_name, last_name, email, contact_number, role_id, role_name, ... }
   *
   * @throws Database query errors
   *
   * Example:
   *   const admins = await userRepository.getUsersByRoleNames(['Admin']);
   *   const managers = await userRepository.getUsersByRoleNames(['Admin', 'Manager']);
   */
  async getUsersByRoleNames(roleNames = []) {
    if (!Array.isArray(roleNames) || roleNames.length === 0) {
      return [];
    }

    /**
     * Build parameterized query for role names
     * Prevents SQL injection and handles dynamic role lists
     * $1, $2, $3... map to VALUES [roleNames[0], roleNames[1], ...]
     */
    const placeholders = roleNames.map((_, idx) => `$${idx + 1}`).join(', ');

    const q = `
      ${this.baseSelectSql()}
      WHERE LOWER(r.name) IN (${placeholders
        .split(', ')
        .map((_, idx) => `LOWER($${idx + 1})`)
        .join(', ')})
      ORDER BY u.id ASC
    `;

    try {
      const rows = await this.dataContext.query(q, roleNames);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get users by role names: ${error.message}`);
    }
  }

  /**
   * Get all users with a specific role name
   * Purpose: Get users for single role notification
   * Used by: notificationService, admin functions
   *
   * @param {string} roleName - Single role name (e.g., 'Admin')
   * @returns {Promise<array>} Array of user objects
   *
   * @throws Database query errors
   *
   * Example:
   *   const admins = await userRepository.getUsersByRoleName('Admin');
   */
  async getUsersByRoleName(roleName) {
    if (!roleName || typeof roleName !== 'string') {
      return [];
    }

    const q = `
      ${this.baseSelectSql()}
      WHERE LOWER(r.name) = LOWER($1)
      ORDER BY u.id ASC
    `;

    try {
      const rows = await this.dataContext.query(q, [roleName]);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get users by role name: ${error.message}`);
    }
  }

  /**
   * Get all users with role IDs
   * Purpose: Get users by role database IDs (if role names not available)
   * Used by: Internal functions, database-driven queries
   *
   * @param {array} roleIds - Array of role IDs [1, 2, 3]
   * @returns {Promise<array>} Array of user objects
   *
   * @throws Database query errors
   *
   * Example:
   *   const users = await userRepository.getUsersByRoleIds([1, 2]);
   */
  async getUsersByRoleIds(roleIds = []) {
    if (!Array.isArray(roleIds) || roleIds.length === 0) {
      return [];
    }

    /**
     * Build dynamic parameter placeholders
     * For roleIds [1, 2, 3]: placeholders = '$1, $2, $3'
     */
    const placeholders = roleIds.map((_, idx) => `$${idx + 1}`).join(', ');

    const q = `
      ${this.baseSelectSql()}
      WHERE u.role_id IN (${placeholders})
      ORDER BY u.id ASC
    `;

    try {
      const rows = await this.dataContext.query(q, roleIds);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get users by role IDs: ${error.message}`);
    }
  }

  /**
   * Get all users with a specific role (case-insensitive) with only necessary fields
   * Purpose: Lightweight query for email notifications (minimal data transfer)
   * Used by: notificationService for efficient bulk emails
   *
   * Query Optimization:
   * - Selects only necessary fields for email
   * - Avoids password_hash in results
   * - Efficient for large user bases
   *
   * @param {string} roleName - Role name (e.g., 'Admin')
   * @returns {Promise<array>} Array of minimal user objects { id, email, first_name, role_name }
   *
   * @throws Database query errors
   *
   * Example:
   *   const users = await userRepository.getUsersByRoleForNotification('Admin');
   */
  async getUsersByRoleForNotification(roleName) {
    if (!roleName || typeof roleName !== 'string') {
      return [];
    }

    /**
     * Lightweight SELECT query
     * Only retrieves fields needed for email notification
     * Excludes sensitive data like password_hash
     */
    const q = `
      SELECT
        u.id,
        u.first_name,
        u.email,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE LOWER(r.name) = LOWER($1)
      ORDER BY u.id ASC
    `;

    try {
      const rows = await this.dataContext.query(q, [roleName]);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get notification users: ${error.message}`);
    }
  }

  /**
   * Get users for multiple roles with lightweight fields
   * Purpose: Efficient bulk retrieval for notifications
   * Used by: notificationService.notifyRoleUsersOfEvent()
   *
   * Optimization:
   * - Single database query for multiple roles
   * - Only returns necessary fields
   * - Efficient for large datasets
   * - Joins with roles table once
   *
   * @param {array} roleNames - Array of role names ['Admin', 'Manager']
   * @returns {Promise<array>} Array of user objects { id, email, first_name, role_name }
   *
   * @throws Database query errors
   *
   * Example:
   *   const users = await userRepository.getUsersByRoleNamesForNotification(['Admin', 'Manager']);
   *   users.forEach(u => console.log(`${u.first_name} (${u.role_name})`));
   */
  async getUsersByRoleNamesForNotification(roleNames = []) {
    if (!Array.isArray(roleNames) || roleNames.length === 0) {
      return [];
    }

    /**
     * Build parameterized placeholders for role names
     * Prevents SQL injection
     * Maps to VALUES: LOWER($1), LOWER($2), ...
     */
    const placeholders = roleNames
      .map((_, idx) => `LOWER($${idx + 1})`)
      .join(', ');

    const q = `
      SELECT
        u.id,
        u.first_name,
        u.email,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE LOWER(r.name) IN (${placeholders})
      ORDER BY u.id ASC
    `;

    try {
      const rows = await this.dataContext.query(q, roleNames);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get notification users by roles: ${error.message}`);
    }
  }
}

module.exports = UserRepository;

