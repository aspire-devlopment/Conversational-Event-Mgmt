/**
 * JWT Authentication Middleware
 * Verifies JWT tokens from Authorization header
 * Extracts and validates user information from token
 */

const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const { sendError } = require('../utils/response');
const JWTTokenService = require('../utils/jwtToken');
const { logJson } = require('../utils/jsonLogger');
const { JWT_CONFIG } = require('../constants/appConfig');

/**
 * Verify JWT token middleware
 * Should be used on protected routes
 * Expects Authorization header: "Bearer <token>"
 */
const verifyJWTToken = (req, res, next) => {
  try {
    const authHeader = req.headers[JWT_CONFIG.HEADER_NAME.toLowerCase()];

    if (!authHeader) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.JWT.HEADER_MISSING
      );
    }

    // Extract token from "Bearer <token>"
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== JWT_CONFIG.HEADER_PREFIX) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.JWT.INVALID_HEADER_FORMAT
      );
    }

    const token = tokenParts[1];

    // Verify token
    try {
      const decoded = JWTTokenService.verifyToken(token);
      
      // Attach user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        role: decoded.role,
      };

      logJson('info', {
        type: 'jwt_verified',
        user_id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      });

      next();
    } catch (tokenError) {
      logJson('warn', {
        type: 'jwt_verification_failed',
        reason: tokenError.message,
      });

      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        tokenError.message
      );
    }
  } catch (error) {
    logJson('error', {
      type: 'auth_middleware_error',
      message: error.message,
    });

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.COMMON.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Optional JWT verification - does not fail if token is missing
 * Adds user info to request if valid token is provided
 */
const optionalVerifyJWTToken = (req, res, next) => {
  try {
    const authHeader = req.headers[JWT_CONFIG.HEADER_NAME.toLowerCase()];

    if (!authHeader) {
      return next();
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== JWT_CONFIG.HEADER_PREFIX) {
      return next();
    }

    const token = tokenParts[1];

    try {
      const decoded = JWTTokenService.verifyToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        role: decoded.role,
      };
    } catch (tokenError) {
      // Log but don't fail - optional verification
      logJson('debug', {
        type: 'optional_jwt_verification_failed',
        reason: tokenError.message,
      });
    }

    next();
  } catch (error) {
    logJson('error', {
      type: 'optional_auth_middleware_error',
      message: error.message,
    });
    next();
  }
};

/**
 * Role-based authorization middleware
 * Should be used after verifyJWTToken
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 */
const authorizeRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'User information not found. Please authenticate first.'
      );
    }

    if (!roles.includes(req.user.role)) {
      logJson('warn', {
        type: 'authorization_failed',
        user_id: req.user.id,
        user_role: req.user.role,
        required_roles: roles,
      });

      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        `Access denied. Required roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};

module.exports = {
  verifyJWTToken,
  optionalVerifyJWTToken,
  authorizeRole,
};
