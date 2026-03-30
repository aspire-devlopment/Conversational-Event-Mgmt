/**
 * File: eventRepository.js
 * Purpose: Event data access layer with duplicate detection
 * Description: Repository class for event database operations:
 *              CRUD operations (list, getById, create, update, remove),
 *              findEquivalentEvent() - detect duplicate events using normalized event identity fields.
 */

class EventRepository {
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  baseSelectSql() {
    return `
      SELECT e.id, e.name, e.subheading, e.description, e.banner_url, e.timezone, e.status,
             e.start_time, e.end_time, e.vanish_time, e.language, e.created_by, e.created_at, e.updated_at,
             COALESCE(
               ARRAY_AGG(DISTINCT r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),
               ARRAY[]::VARCHAR[]
             ) AS roles
      FROM events e
      LEFT JOIN event_roles er ON er.event_id = e.id
      LEFT JOIN roles r ON r.id = er.role_id
    `;
  }

  async list() {
    const q = `
      ${this.baseSelectSql()}
      GROUP BY e.id
      ORDER BY e.id DESC
    `;
    return this.dataContext.query(q);
  }

  async getById(id) {
    return this.getByIdWithContext(this.dataContext, id);
  }

  async create(payload) {
    const q = `
      INSERT INTO events (
        name, subheading, description, banner_url, timezone, status,
        start_time, end_time, vanish_time, language, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, name, subheading, description, banner_url, timezone, status,
                start_time, end_time, vanish_time, language, created_by, created_at, updated_at
    `;
    const v = [
      payload.name,
      payload.subheading || null,
      payload.description || null,
      payload.banner_url || null,
      payload.timezone,
      payload.status || 'Draft',
      payload.start_time,
      payload.end_time,
      payload.vanish_time || null,
      payload.language || 'en',
      payload.created_by || null,
    ];
    const rows = await this.dataContext.query(q, v);
    return rows[0];
  }

  async createWithRoles(payload, roleNames = []) {
    return this.dataContext.withTransaction(async (tx) => {
      const rows = await tx.query(
        `
          INSERT INTO events (
            name, subheading, description, banner_url, timezone, status,
            start_time, end_time, vanish_time, language, created_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          RETURNING id
        `,
        [
          payload.name,
          payload.subheading || null,
          payload.description || null,
          payload.banner_url || null,
          payload.timezone,
          payload.status || 'Draft',
          payload.start_time,
          payload.end_time,
          payload.vanish_time || null,
          payload.language || 'en',
          payload.created_by || null,
        ]
      );

      const eventId = rows[0]?.id;
      if (!eventId) return null;

      await this.syncEventRoles(tx, eventId, roleNames);
      return this.getByIdWithContext(tx, eventId);
    });
  }

  async update(id, payload) {
    const q = `
      UPDATE events
      SET name = COALESCE($2, name),
          subheading = COALESCE($3, subheading),
          description = COALESCE($4, description),
          banner_url = COALESCE($5, banner_url),
          timezone = COALESCE($6, timezone),
          status = COALESCE($7, status),
          start_time = COALESCE($8, start_time),
          end_time = COALESCE($9, end_time),
          vanish_time = COALESCE($10, vanish_time),
          language = COALESCE($11, language),
          created_by = COALESCE($12, created_by),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, subheading, description, banner_url, timezone, status,
                start_time, end_time, vanish_time, language, created_by, created_at, updated_at
    `;
    const v = [
      id,
      payload.name,
      payload.subheading,
      payload.description,
      payload.banner_url,
      payload.timezone,
      payload.status,
      payload.start_time,
      payload.end_time,
      payload.vanish_time,
      payload.language,
      payload.created_by,
    ];
    const rows = await this.dataContext.query(q, v);
    return rows[0] || null;
  }

  async updateWithRoles(id, payload, roleNames = null) {
    return this.dataContext.withTransaction(async (tx) => {
      const rows = await tx.query(
        `
          UPDATE events
          SET name = COALESCE($2, name),
              subheading = COALESCE($3, subheading),
              description = COALESCE($4, description),
              banner_url = COALESCE($5, banner_url),
              timezone = COALESCE($6, timezone),
              status = COALESCE($7, status),
              start_time = COALESCE($8, start_time),
              end_time = COALESCE($9, end_time),
              vanish_time = COALESCE($10, vanish_time),
              language = COALESCE($11, language),
              created_by = COALESCE($12, created_by),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id
        `,
        [
          id,
          payload.name,
          payload.subheading,
          payload.description,
          payload.banner_url,
          payload.timezone,
          payload.status,
          payload.start_time,
          payload.end_time,
          payload.vanish_time,
          payload.language,
          payload.created_by,
        ]
      );

      const eventId = rows[0]?.id;
      if (!eventId) return null;

      if (Array.isArray(roleNames)) {
        await tx.execute('DELETE FROM event_roles WHERE event_id = $1', [eventId]);
        await this.syncEventRoles(tx, eventId, roleNames);
      }

      return this.getByIdWithContext(tx, eventId);
    });
  }

  async remove(id) {
    const result = await this.dataContext.execute('DELETE FROM events WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async findEquivalentEvent(identity, excludeEventId = null) {
    const q = `
      ${this.baseSelectSql()}
      WHERE e.created_by = $1
        AND LOWER(TRIM(e.name)) = $2
        AND COALESCE(LOWER(TRIM(e.subheading)), '') = COALESCE($3, '')
        AND LOWER(TRIM(e.timezone)) = $4
        AND COALESCE(LOWER(TRIM(e.status)), 'draft') = $5
        AND e.start_time = $6
        AND e.end_time = $7
        AND (($8::timestamp IS NULL AND e.vanish_time IS NULL) OR e.vanish_time = $8)
        AND COALESCE(LOWER(TRIM(e.language)), 'en') = $9
        AND ($10::int IS NULL OR e.id <> $10)
      GROUP BY e.id
      HAVING COALESCE(
        ARRAY_AGG(DISTINCT r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),
        ARRAY[]::VARCHAR[]
      ) = COALESCE($11::VARCHAR[], ARRAY[]::VARCHAR[])
      ORDER BY e.created_at DESC
      LIMIT 1
    `;
    const v = [
      identity.created_by,
      identity.name,
      identity.subheading,
      identity.timezone,
      identity.status || 'Draft',
      identity.start_time,
      identity.end_time,
      identity.vanish_time,
      identity.language || 'en',
      excludeEventId,
      identity.roles || [],
    ];
    const rows = await this.dataContext.query(q, v);
    return rows[0] || null;
  }

  async syncEventRoles(context, eventId, roleNames = []) {
    if (!Array.isArray(roleNames) || roleNames.length === 0) {
      return;
    }

    const normalizedRoleNames = [...new Set(roleNames.filter(Boolean))];
    const roleRows = await context.query(
      'SELECT id, name FROM roles WHERE name = ANY($1::varchar[])',
      [normalizedRoleNames]
    );
    const roleIdMap = new Map(roleRows.map((role) => [role.name, role.id]));

    for (const roleName of normalizedRoleNames) {
      const roleId = roleIdMap.get(roleName);
      if (!roleId) continue;
      await context.execute(
        `INSERT INTO event_roles (event_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (event_id, role_id) DO NOTHING`,
        [eventId, roleId]
      );
    }
  }

  async getByIdWithContext(context, id) {
    const q = `
      ${this.baseSelectSql()}
      WHERE e.id = $1
      GROUP BY e.id
    `;
    const rows = await context.query(q, [id]);
    return rows[0] || null;
  }
}

module.exports = EventRepository;

