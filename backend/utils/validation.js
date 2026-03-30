/**
 * File: validation.js
 * Purpose: Data validation utility functions
 * Description: Provides validation helper functions:
 *              isEmail() - validate email format,
 *              isPhoneNumber() - validate phone number formats,
 *              isNonEmptyString() - check string is not empty,
 *              isPositiveInteger() - validate positive integer,
 *              normalizeEmail() - convert email to lowercase.
 */

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const isEmail = (value) => {
  if (!isNonEmptyString(value)) return false;
  // Validating email format (case-insensitive by nature of email spec)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const isPhoneNumber = (value) => {
  if (!isNonEmptyString(value)) return false;
  // Accepts various phone formats: (123) 456-7890, 123-456-7890, 1234567890, +1234567890, +1 (123) 456-7890
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(value.trim().replace(/\s/g, ''));
};

const isPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
};

// Normalize email to lowercase for consistent storage and comparison
const normalizeEmail = (email) => {
  return isNonEmptyString(email) ? email.trim().toLowerCase() : email;
};

module.exports = {
  isNonEmptyString,
  isEmail,
  isPhoneNumber,
  isPositiveInteger,
  normalizeEmail,
};

