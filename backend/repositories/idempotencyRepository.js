class IdempotencyRepository {
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  async findByUserScopeAndKey(userId, scope, key) {
    const rows = await this.dataContext.query(
      `
        SELECT id, user_id, scope, idempotency_key, request_hash, status,
               response_status_code, response_body, resource_id, created_at, updated_at
        FROM idempotency_keys
        WHERE user_id = $1 AND scope = $2 AND idempotency_key = $3
        LIMIT 1
      `,
      [userId, scope, key]
    );

    return rows[0] || null;
  }

  async claimRequest(userId, scope, key, requestHash) {
    const inserted = await this.dataContext.query(
      `
        INSERT INTO idempotency_keys (
          user_id, scope, idempotency_key, request_hash, status
        )
        VALUES ($1, $2, $3, $4, 'pending')
        ON CONFLICT (user_id, scope, idempotency_key) DO NOTHING
        RETURNING id, user_id, scope, idempotency_key, request_hash, status,
                  response_status_code, response_body, resource_id, created_at, updated_at
      `,
      [userId, scope, key, requestHash]
    );

    if (inserted[0]) {
      return { state: 'claimed', record: inserted[0] };
    }

    const existing = await this.findByUserScopeAndKey(userId, scope, key);
    if (!existing) {
      return { state: 'missing', record: null };
    }

    if (existing.request_hash !== requestHash) {
      return { state: 'mismatch', record: existing };
    }

    if (existing.response_body) {
      return { state: 'replay', record: existing };
    }

    return { state: 'pending', record: existing };
  }

  async completeRequest(id, statusCode, responseBody, resourceId = null) {
    const rows = await this.dataContext.query(
      `
        UPDATE idempotency_keys
        SET status = 'completed',
            response_status_code = $2,
            response_body = $3::jsonb,
            resource_id = COALESCE($4, resource_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, user_id, scope, idempotency_key, request_hash, status,
                  response_status_code, response_body, resource_id, created_at, updated_at
      `,
      [id, statusCode, JSON.stringify(responseBody), resourceId]
    );

    return rows[0] || null;
  }
}

module.exports = IdempotencyRepository;
