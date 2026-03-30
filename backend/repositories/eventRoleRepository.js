/**
 * File: eventRoleRepository.js
 * Purpose: Event role assignments data access layer
 * Description: Repository class for event role database operations:
 *              list() - get all role assignments,
 *              findByEventAndUser() - find assignments for specific event/user,
 *              assign() - create new role assignment,
 *              unassign() - remove role assignment.
 */

class EventRoleRepository {
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  async list() {
    const rows = await this.dataContext.query(
      'SELECT event_id, role_id FROM event_roles ORDER BY event_id, role_id'
    );
    return rows;
  }

  async assign(eventId, roleId) {
    const q = `
      INSERT INTO event_roles (event_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (event_id, role_id) DO NOTHING
      RETURNING event_id, role_id
    `;
    const rows = await this.dataContext.query(q, [eventId, roleId]);
    return rows[0] || { event_id: Number(eventId), role_id: Number(roleId) };
  }

  async clearForEvent(eventId) {
    const result = await this.dataContext.execute(
      'DELETE FROM event_roles WHERE event_id = $1',
      [eventId]
    );
    return result.rowCount >= 0;
  }

  async listRoleNamesForEvent(eventId) {
    const rows = await this.dataContext.query(
      `
        SELECT r.name
        FROM event_roles er
        INNER JOIN roles r ON r.id = er.role_id
        WHERE er.event_id = $1
        ORDER BY r.name
      `,
      [eventId]
    );
    return rows.map((row) => row.name);
  }

  async unassign(eventId, roleId) {
    const result = await this.dataContext.execute(
      'DELETE FROM event_roles WHERE event_id = $1 AND role_id = $2',
      [eventId, roleId]
    );
    return result.rowCount > 0;
  }
}

module.exports = EventRoleRepository;

