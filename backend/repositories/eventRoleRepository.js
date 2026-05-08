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
  // Store the database context used for event-role mapping queries.
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  // Return all event-role mappings.
  async list() {
    const rows = await this.dataContext.query(
      'SELECT event_id, role_id FROM event_roles ORDER BY event_id, role_id'
    );
    return rows;
  }

  // Assign a role to an event; duplicate assignments are ignored by the unique key.
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

  // Remove all role mappings before replacing an event's role set.
  async clearForEvent(eventId) {
    const result = await this.dataContext.execute(
      'DELETE FROM event_roles WHERE event_id = $1',
      [eventId]
    );
    return result.rowCount >= 0;
  }

  // Return display names, not IDs, because controllers and the chat draft use role names.
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

  // Remove one role assignment from an event.
  async unassign(eventId, roleId) {
    const result = await this.dataContext.execute(
      'DELETE FROM event_roles WHERE event_id = $1 AND role_id = $2',
      [eventId, roleId]
    );
    return result.rowCount > 0;
  }
}

module.exports = EventRoleRepository;

