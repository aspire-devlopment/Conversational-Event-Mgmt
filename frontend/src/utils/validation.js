/**
 * Validation utility functions
 */

const VALIDATION_MIN_LENGTH = {
  PASSWORD: 6,
  FIRST_NAME: 2,
  LAST_NAME: 2,
  PHONE: 10,
};

export const validators = {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {string} Error message or empty string
   */
  email: (email) => {
    if (!email) return 'Email is required';
    // Email regex - case insensitive validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    return '';
  },

  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {string} Error message or empty string
   */
  phone: (phone) => {
    if (!phone) return 'Phone number is required';
    // Accepts various phone formats: (123) 456-7890, 123-456-7890, 1234567890, +1234567890
    const phoneRegex = /^[+]?[()]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(phone.trim().replace(/\s/g, ''))) {
      return 'Please enter a valid phone number (e.g., 123-456-7890)';
    }
    return '';
  },

  /**
   * Validate password
   * @param {string} password - Password to validate
   * @returns {string} Error message or empty string
   */
  password: (password) => {
    if (!password) return 'Password is required';
    if (password.length < VALIDATION_MIN_LENGTH.PASSWORD) {
      return `Password must be at least ${VALIDATION_MIN_LENGTH.PASSWORD} characters long`;
    }
    return '';
  },

  /**
   * Validate required field
   * @param {string} value - Value to validate
   * @param {string} fieldName - Name of the field
   * @returns {string} Error message or empty string
   */
  required: (value, fieldName = 'Field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return '';
  },

  /**
   * Validate first name
   * @param {string} firstName - First name to validate
   * @returns {string} Error message or empty string
   */
  firstName: (firstName) => {
    if (!firstName || !firstName.trim()) return 'First name is required';
    if (firstName.trim().length < VALIDATION_MIN_LENGTH.FIRST_NAME) {
      return `First name must be at least ${VALIDATION_MIN_LENGTH.FIRST_NAME} characters`;
    }
    return '';
  },

  /**
   * Validate last name
   * @param {string} lastName - Last name to validate
   * @returns {string} Error message or empty string
   */
  lastName: (lastName) => {
    if (!lastName || !lastName.trim()) return 'Last name is required';
    if (lastName.trim().length < VALIDATION_MIN_LENGTH.LAST_NAME) {
      return `Last name must be at least ${VALIDATION_MIN_LENGTH.LAST_NAME} characters`;
    }
    return '';
  },
};

/**
 * Validate form fields
 * @param {Object} values - Form values to validate
 * @param {Object} validationRules - Rules for validation
 * @returns {Object} Errors object
 */
export const validateForm = (values, validationRules) => {
  const errors = {};

  Object.keys(validationRules).forEach((field) => {
    const rule = validationRules[field];
    const value = values[field];

    if (typeof rule === 'function') {
      const error = rule(value);
      if (error) errors[field] = error;
    } else if (Array.isArray(rule)) {
      // Support multiple validators
      for (const validator of rule) {
        const error = validator(value);
        if (error) {
          errors[field] = error;
          break;
        }
      }
    }
  });

  return errors;
};

/**
 * Check if form has errors
 * @param {Object} errors - Errors object
 * @returns {boolean}
 */
export const hasErrors = (errors) => {
  return Object.keys(errors).some((key) => errors[key]);
};
