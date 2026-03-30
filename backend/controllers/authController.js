// Authentication Controller
// Purpose: Handles HTTP requests for user authentication operations.
// This controller provides endpoints for:
//   - Login: Authenticate user with email and password, return auth data
//   - Register: Create a new user account
//   - Logout: Invalidate user session/token
// Uses dependency injection to receive authService for authentication business logic.

/**
 * File: authController.js
 * Purpose: Authentication request handlers
 * Description: Controller factory that creates authentication handlers:
 *              login(), register(), logout(), getProfile().
 *              Handles JWT token generation and user profile operations.
 */

const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const { sendError, sendSuccess } = require('../utils/response');

const createAuthController = (authService) => ({
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const authData = await authService.login(email, password);
      if (!authData) {
        return sendError(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          MESSAGES.AUTH.INVALID_CREDENTIALS
        );
      }

      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        MESSAGES.AUTH.LOGIN_SUCCESS,
        authData
      );
    } catch (error) {
      return next(error);
    }
  },

  register: async (req, res, next) => {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(
        res,
        HTTP_STATUS.CREATED,
        MESSAGES.AUTH.REGISTER_SUCCESS,
        { token: result.token, user: result.user }
      );
    } catch (error) {
      return next(error);
    }
  },

  logout: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      authService.logout(token);
      return sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.LOGOUT_SUCCESS);
    } catch (error) {
      return next(error);
    }
  },

  getProfile: async (req, res, next) => {
    try {
      // req.user is populated by verifyJWTToken middleware
      if (!req.user) {
        return sendError(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          MESSAGES.AUTH.UNAUTHORIZED
        );
      }
      return sendSuccess(res, HTTP_STATUS.OK, 'Profile fetched successfully', { 
        user: req.user 
      });
    } catch (error) {
      return next(error);
    }
  },
});

module.exports = createAuthController;
