/**
 * File: messages.js
 * Purpose: User-facing messages and error messages
 * Description: Centralized messages for API responses organized by category:
 *              COMMON (general errors), AUTH (authentication/registration),
 *              EVENTS (event operations), JWT (token-related).
 */

const MESSAGES = {
  COMMON: {
    INTERNAL_SERVER_ERROR: 'Internal Server Error',
    VALIDATION_FAILED: 'Validation failed',
    ROUTE_NOT_FOUND: 'Route not found',
  },
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGIN_FAILED: 'Login failed',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_PASSWORD_REQUIRED: 'Email and password are required',
    PASSWORD_RESET_REQUIRED: 'New password is required',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    USER_NOT_FOUND: 'User not found',
    LOGOUT_SUCCESS: 'Logout successful',
    LOGOUT_FAILED: 'Logout failed',
    PROFILE_FETCH_FAILED: 'Failed to fetch profile',
    UNAUTHORIZED: 'Unauthorized',
    REGISTER_SUCCESS: 'Registration successful',
    REGISTER_FAILED: 'Registration failed',
    EMAIL_EXISTS: 'Email already registered',
    ALL_FIELDS_REQUIRED: 'All fields are required',
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_PHONE: 'Please provide a valid phone number (e.g., 123-456-7890 or (123) 456-7890)',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long',
    INVALID_ROLE: 'Please select a valid role (Manager, Sales Rep, or Viewer)',
    FIRST_NAME_REQUIRED: 'First name is required',
    LAST_NAME_REQUIRED: 'Last name is required',
    CONTACT_NUMBER_REQUIRED: 'Contact number is required',
    ROLE_REQUIRED: 'Role is required',
  },
  EVENTS: {
    FETCH_FAILED: 'Failed to fetch events',
    FETCH_ONE_FAILED: 'Failed to fetch event',
    EVENT_NOT_FOUND: 'Event not found',
    CREATE_SUCCESS: 'Event created successfully',
    CREATE_FAILED: 'Failed to create event',
    UPDATE_SUCCESS: 'Event updated successfully',
    UPDATE_FAILED: 'Failed to update event',
    DELETE_SUCCESS: 'Event deleted successfully',
    DELETE_FAILED: 'Failed to delete event',
    REQUIRED_FIELDS: 'All fields are required',
    DUPLICATE_EVENT: 'An equivalent event already exists for this user. Change the event details before creating another one.',
    USER_ID_REQUIRED: 'User ID is required to create an event',
  },
  JWT: {
    TOKEN_REQUIRED: 'Token is required',
    INVALID_HEADER_FORMAT: 'Invalid authorization header format. Use: Bearer <token>',
    HEADER_MISSING: 'Authorization header is missing',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_SIGNATURE: 'Invalid token signature',
    VERIFICATION_FAILED: 'Token verification failed',
  },
};

module.exports = MESSAGES;

