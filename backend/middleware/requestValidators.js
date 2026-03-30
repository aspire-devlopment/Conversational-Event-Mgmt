// Request Validators Middleware (Legacy API)
// Purpose: Validates request payloads for legacy API endpoints (/api/auth, /api/events).
// This middleware provides validation functions for:
//   - validateLogin: Checks email format and password presence
//   - validateRegister: Validates user signup data (email, first/last name, phone, password)
//   - validateEventPayload: Validates event creation data (title, description, date, time, location, capacity)
// How validation works:
//   1. Extracts fields from req.body
//   2. Uses utility functions to check data type and format (email, string, positive integer)
//   3. Returns BAD_REQUEST error if validation fails
//   4. Calls next() to proceed if validation passes
// Usage: Applied as middleware in legacy routes (e.g., app.post('/api/auth/login', validateLogin, handler))
// Note: Legacy middleware. New v1 API uses v1Validators.js with schema-based validation

/**
 * File: requestValidators.js
 * Purpose: Request payload validation middleware (legacy API)
 * Description: Validates request data for authentication and event endpoints:
 *              validateLogin(), validateRegister(), validateEventPayload(),
 *              validateEventIdParam(), createValidateEventDuplicate().
 *              Returns 400 Bad Request on validation failure.
 */

const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const { sendError } = require('../utils/response');
const { isEmail, isNonEmptyString, isPositiveInteger, isPhoneNumber } = require('../utils/validation');
const { VALID_USER_ROLES, VALIDATION_CONFIG } = require('../constants/appConfig');
const { buildEventIdentity } = require('../utils/eventIdentity');

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!isEmail(email) || !isNonEmptyString(password)) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      MESSAGES.AUTH.EMAIL_PASSWORD_REQUIRED
    );
  }
  return next();
};

const validateRegister = (req, res, next) => {
  const { email, firstName, lastName, phone, password, role } = req.body;

  if (!isEmail(email)) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      MESSAGES.AUTH.INVALID_EMAIL
    );
  }

  if (!isNonEmptyString(firstName) || !isNonEmptyString(lastName)) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      MESSAGES.AUTH.FIRST_NAME_REQUIRED
    );
  }

  if (!isPhoneNumber(phone)) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      MESSAGES.AUTH.INVALID_PHONE
    );
  }

  if (!isNonEmptyString(password) || password.length < VALIDATION_CONFIG.PASSWORD_MIN_LENGTH) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      MESSAGES.AUTH.PASSWORD_TOO_SHORT
    );
  }

  // Validate role
  if (!role || !VALID_USER_ROLES.includes(role)) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      MESSAGES.AUTH.INVALID_ROLE
    );
  }

  return next();
};

const validateAdminPasswordReset = (req, res, next) => {
  const { newPassword } = req.body;

  if (
    !isNonEmptyString(newPassword) ||
    newPassword.length < VALIDATION_CONFIG.PASSWORD_MIN_LENGTH
  ) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      MESSAGES.AUTH.PASSWORD_RESET_REQUIRED
    );
  }

  return next();
};

const validateEventPayload = (req, res, next) => {
  // Support both old schema (title, description, date, time, location, capacity)
  // and new schema (name, subheading, description, timezone, start_time, end_time)
  const { title, name, description, date, time, location, capacity, timezone, start_time, end_time } = req.body;
  
  // Check if it's old schema (legacy API)
  const isOldSchema = !!(title || date || time || location || capacity);
  // Check if it's new schema (v1+ API)
  const isNewSchema = !!(name || timezone || start_time || end_time);
  
  if (isOldSchema) {
    // Validate old schema fields
    if (
      !isNonEmptyString(title) ||
      !isNonEmptyString(description) ||
      !isNonEmptyString(date) ||
      !isNonEmptyString(time) ||
      !isNonEmptyString(location) ||
      !isPositiveInteger(capacity)
    ) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        MESSAGES.EVENTS.REQUIRED_FIELDS
      );
    }
  } else if (isNewSchema) {
    // Validate new schema fields
    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(description) ||
      !isNonEmptyString(timezone) ||
      !isNonEmptyString(start_time) ||
      !isNonEmptyString(end_time)
    ) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        MESSAGES.EVENTS.REQUIRED_FIELDS
      );
    }
  } else {
    // Neither schema found
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      MESSAGES.EVENTS.REQUIRED_FIELDS
    );
  }
  
  return next();
};

const validateEventIdParam = (req, res, next) => {
  if (!isPositiveInteger(req.params.id)) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid event id');
  }
  return next();
};

const createValidateEventDuplicate = (eventRepository) => {
  return async (req, res, next) => {
    try {
      const createdBy = req.user?.id;

      if (!createdBy) {
        return next();
      }

      const identity = buildEventIdentity({
        ...req.body,
        created_by: createdBy,
      });

      if (!identity.name || !identity.timezone || !identity.start_time || !identity.end_time) {
        return next();
      }

      const duplicateEvent = await eventRepository.findEquivalentEvent(identity);

      if (duplicateEvent) {
        return sendError(
          res,
          HTTP_STATUS.CONFLICT,
          MESSAGES.EVENTS.DUPLICATE_EVENT,
          { eventId: duplicateEvent.id }
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = {
  validateLogin,
  validateRegister,
  validateAdminPasswordReset,
  validateEventPayload,
  validateEventIdParam,
  createValidateEventDuplicate,
};

