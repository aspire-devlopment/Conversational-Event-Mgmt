// Request Validators Middleware (v1 API)
// Purpose: Validates request payloads and parameters for the new versioned API (/api/v1/*).
// This middleware provides validation functions for all v1 endpoints:
//   - requireIdParam: Validates that ID parameter is a positive integer
//   - validateUserPayload: Validates user creation/update (first_name, email required)
//   - validateRolePayload: Validates role creation/update (name required)
//   - validateEventPayloadV1: Validates event creation/update (name, timezone, start_time, end_time required)
//   - validateChatSessionPayload: Validates chat session data (session_data must be JSON object)
//   - validateAssignPayload: Validates event-role assignment (event_id, role_id required)
// How validation works:
//   1. Extracts fields from req.params or req.body
//   2. Uses utility functions to check data type, format, and constraints
//   3. Returns BAD_REQUEST error with specific message if validation fails
//   4. Calls next() to proceed to handler if validation passes
// Usage: Applied as middleware in v1 routes (e.g., router.post('/users', validateUserPayload, handler))
// Best practice: Always use appropriate validator before reaching controller

/**
 * File: v1Validators.js
 * Purpose: Request validation middleware for v1 API
 * Description: Validates request payloads for v1 RESTful endpoints:
 *              validateUserPayload(), validateRolePayload(), validateEventPayloadV1(),
 *              validateChatSessionPayload(), validateEventRolePayload().
 *              Decoupled from legacy validators for cleaner architecture.
 */

const HTTP_STATUS = require('../constants/httpStatus');
const { sendError } = require('../utils/response');
const { isEmail, isNonEmptyString, isPositiveInteger } = require('../utils/validation');

const requireIdParam = (req, res, next) => {
  if (!isPositiveInteger(req.params.id)) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid id parameter');
  }
  return next();
};

const validateUserPayload = (req, res, next) => {
  const { first_name, email } = req.body;
  if (!isNonEmptyString(first_name) || !isEmail(email)) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'first_name and valid email are required');
  }
  return next();
};

const validateRolePayload = (req, res, next) => {
  if (!isNonEmptyString(req.body.name)) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'role name is required');
  }
  return next();
};

const validateEventPayloadV1 = (req, res, next) => {
  const { name, timezone, start_time, end_time } = req.body;
  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(timezone) ||
    !isNonEmptyString(start_time) ||
    !isNonEmptyString(end_time)
  ) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'name, timezone, start_time and end_time are required'
    );
  }
  return next();
};

const validateChatSessionPayload = (req, res, next) => {
  if (typeof req.body.session_data !== 'object' || req.body.session_data === null) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'session_data must be a JSON object');
  }
  return next();
};

const validateEventRolePayload = (req, res, next) => {
  const { event_id, role_id } = req.body;
  if (!isPositiveInteger(event_id) || !isPositiveInteger(role_id)) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'event_id and role_id must be positive integers');
  }
  return next();
};

module.exports = {
  requireIdParam,
  validateUserPayload,
  validateRolePayload,
  validateEventPayloadV1,
  validateChatSessionPayload,
  validateEventRolePayload,
};

