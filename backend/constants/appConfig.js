/**
 * Application-wide Constants
 * Central configuration for roles, defaults, and application settings
 */

const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES_REP: 'Sales Rep',
  VIEWER: 'Viewer',
};

// Valid roles that users can select during registration (excludes Admin)
const VALID_USER_ROLES = [
  ROLES.MANAGER,
  ROLES.SALES_REP,
  ROLES.VIEWER,
];

// All roles (including Admin for internal use)
const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.SALES_REP,
  ROLES.VIEWER,
];

// Default role for new users
const DEFAULT_USER_ROLE = ROLES.VIEWER;

// JWT Configuration
const JWT_CONFIG = {
  ALGORITHM: 'HS256',
  HEADER_PREFIX: 'Bearer',
  HEADER_NAME: 'Authorization',
};

// Validation Rules
const VALIDATION_CONFIG = {
  PASSWORD_MIN_LENGTH: 6,
  FIRST_NAME_MIN_LENGTH: 2,
  LAST_NAME_MIN_LENGTH: 2,
  PHONE_MIN_LENGTH: 10,
};

// Response Configuration
const RESPONSE_CONFIG = {
  SUCCESS_STATUS: 'success',
  FAILURE_STATUS: 'failure',
};

// Database Configuration
const DB_CONFIG = {
  CONNECTION_TIMEOUT_MS: 5000,
  IDLE_TIMEOUT_MS: 30000,
  POOL_MAX_CONNECTIONS: 10,
};

module.exports = {
  ROLES,
  VALID_USER_ROLES,
  ALL_ROLES,
  DEFAULT_USER_ROLE,
  JWT_CONFIG,
  VALIDATION_CONFIG,
  RESPONSE_CONFIG,
  DB_CONFIG,
};
