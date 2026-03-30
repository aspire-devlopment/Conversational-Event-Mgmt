/**
 * File: passwordService.js
 * Purpose: Password hashing and verification utility
 * Description: Service for secure password operations:
 *              hashPassword() - hash plain text password with bcrypt,
 *              comparePassword() - verify plain text against hashed password.
 *              Uses bcrypt with configurable salt rounds for security.
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

/**
 * Hash a plain text password using bcrypt
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} - Hashed password
 * @throws {Error} - If hashing fails
 */
const hashPassword = async (password) => {
  try {
    if (!password || password.trim().length === 0) {
      throw new Error('Password cannot be empty');
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} plainPassword - Plain text password to verify
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 * @throws {Error} - If comparison fails
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    if (!plainPassword || !hashedPassword) {
      return false;
    }
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

module.exports = {
  hashPassword,
  comparePassword,
};
