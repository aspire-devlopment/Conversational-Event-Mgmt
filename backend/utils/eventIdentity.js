/**
 * File: eventIdentity.js
 * Purpose: Canonical identity builder for duplicate/idempotency checks.
 * Description: Normalizes event fields and roles into a stable object, then hashes
 *              it so repeated equivalent event requests can be detected safely.
 */
const crypto = require('crypto');

const ROLE_NAME_MAP = {
  admin: 'Admin',
  manager: 'Manager',
  'sales rep': 'Sales Rep',
  salesrep: 'Sales Rep',
  viewer: 'Viewer',
};

// Trim and optionally lowercase text used in duplicate-event identity checks.
const normalizeString = (value, { lower = false } = {}) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return lower ? normalized.toLowerCase() : normalized;
};

// Convert supported datetime text into the same comparable string shape.
const normalizeDateTime = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return normalized.replace('T', ' ').replace(/Z$/, '');
};

// Convert flexible role text into the exact role name used by the database.
const normalizeRole = (role) => {
  const normalized = normalizeString(role, { lower: true });
  if (!normalized) return null;
  return ROLE_NAME_MAP[normalized] || role;
};

// Normalize, deduplicate, and sort role names so role order does not affect identity.
const normalizeRoles = (roles) => {
  if (!Array.isArray(roles)) return [];

  return Array.from(
    new Set(
      roles
        .map((role) => normalizeRole(role))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
};

// Use only fields that define whether two event creation requests are equivalent.
const buildEventIdentity = (payload = {}) => ({
  created_by: payload.created_by ? Number(payload.created_by) : null,
  name: normalizeString(payload.name, { lower: true }),
  subheading: normalizeString(payload.subheading, { lower: true }),
  timezone: normalizeString(payload.timezone, { lower: true }),
  status: normalizeString(payload.status || 'Draft', { lower: true }),
  start_time: normalizeDateTime(payload.start_time || payload.startTime),
  end_time: normalizeDateTime(payload.end_time || payload.endTime),
  vanish_time: normalizeDateTime(payload.vanish_time || payload.vanishTime),
  language: normalizeString(payload.language || 'en', { lower: true }),
  roles: normalizeRoles(payload.roles),
});

// Hash the normalized identity for compact idempotency storage/comparison.
const hashEventIdentity = (identity) =>
  crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex');

module.exports = {
  buildEventIdentity,
  hashEventIdentity,
  normalizeRoles,
};
