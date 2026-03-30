/**
 * File: httpStatus.js
 * Purpose: HTTP status code constants
 * Description: Centralized HTTP status codes used throughout the API for consistent
 *              response status code usage (200, 201, 400, 401, 404, 409, 500).
 */

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

module.exports = HTTP_STATUS;

