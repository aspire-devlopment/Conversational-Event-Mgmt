/**
 * JWT Token Service
 * Handles JWT token generation and verification with proper signature
 * @module utils/jwtToken
 */

/**
 * File: jwtToken.js
 * Purpose: JWT token generation and verification
 * Description: Service for JWT operations with HS256 algorithm:
 *              generateToken() - create JWT with user payload,
 *              verifyToken() - verify token signature and return decoded payload,
 *              isTokenExpired() - check if token has expired,
 *              getTokenExpiration() - get expiration time from token.
 */

const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../constants/appConfig');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production_min_32_chars';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

class JWTTokenService {
  /**
   * Generate JWT token
   * @param {Object} payload - Token payload (user data)
   * @param {number} id - User ID
   * @param {string} email - User email
   * @param {string} role - User role
   * @returns {string} Signed JWT token
   */
  static generateToken(payload) {
    if (!payload || !payload.id || !payload.email) {
      throw new Error('Invalid token payload: id and email are required');
    }

    const tokenPayload = {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName || payload.first_name,
      lastName: payload.lastName || payload.last_name,
      role: payload.role,
      iat: Math.floor(Date.now() / 1000), // Issued at
    };

    try {
      const token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRATION,
        algorithm: JWT_CONFIG.ALGORITHM,
      });
      return token;
    } catch (error) {
      throw new Error(`Failed to generate token: ${error.message}`);
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  static verifyToken(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: [JWT_CONFIG.ALGORITHM],
      });
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token signature');
      } else {
        throw new Error(`Token verification failed: ${error.message}`);
      }
    }
  }

  /**
   * Decode token without verification (for debugging only)
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded token payload
   */
  static decodeToken(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error(`Failed to decode token: ${error.message}`);
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired
   */
  static isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date or null if not available
   */
  static getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}

module.exports = JWTTokenService;
