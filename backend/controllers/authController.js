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

// Build auth request handlers with the injected authentication service.
const createAuthController = (authService) => ({
  // Authenticate credentials and return a JWT plus sanitized user profile.
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      console.log('[authController.login] START', { emailType: typeof email, passwordType: typeof password, passwordLength: password ? password.length : 0 });
      // Validate input types to avoid passing non-string passwords
      // into downstream libraries (bcrypt / DB drivers) which can
      // produce low-level errors like "client password must be a string".
      if (typeof password !== 'string') {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          'Password must be a string'
        );
      }
      if (password.trim().length === 0) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          'Password cannot be empty'
        );
      }
      console.log('[authController.login] CALLING authService.login');
      const authData = await authService.login(email, password);
      console.log('[authController.login] authService.login SUCCESS');
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
      console.error('[authController.login] ERROR:', { message: error.message, stack: error.stack });
      return next(error);
    }
  },

  // Register a new user and return the same auth payload as login.
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

  // Handle logout requests; token invalidation is currently stateless.
  logout: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      authService.logout(token);
      return sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.LOGOUT_SUCCESS);
    } catch (error) {
      return next(error);
    }
  },

  // Return the authenticated profile that JWT middleware attached to req.user.
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
