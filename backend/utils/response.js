/**
 * File: response.js
 * Purpose: Standardized API response formatting
 * Description: Provides utility functions for consistent JSON responses:
 *              sendSuccess() - return successful response with data,
 *              sendError() - return error response with error message.
 *              All responses follow standard format: {status, message, data}.
 */

const sendSuccess = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({
    status: 'success',
    ...(message ? { message } : {}),
    data,
  });
};

const sendError = (res, statusCode, message, details) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(details ? { details } : {}),
  });
};

module.exports = {
  sendSuccess,
  sendError,
};

