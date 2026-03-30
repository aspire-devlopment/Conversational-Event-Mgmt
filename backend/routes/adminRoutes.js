/**
 * File: adminRoutes.js
 * Purpose: Admin-only routes for user management
 * Description: Provides admin user listing and password reset endpoints.
 */

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { verifyJWTToken, authorizeRole } = require('../middleware/authMiddleware');
const { validateAdminPasswordReset } = require('../middleware/requestValidators');
const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const { ROLES } = require('../constants/appConfig');
const { sendError, sendSuccess } = require('../utils/response');
const { hashPassword } = require('../utils/passwordService');
const createRepositories = require('../data/repositoryFactory');

const router = express.Router();
const repositories = createRepositories();

const sanitizeUser = (user) => ({
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  contact_number: user.contact_number,
  role_id: user.role_id,
  role: user.role,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

router.use(verifyJWTToken, authorizeRole(ROLES.ADMIN));

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await repositories.userRepository.list();
    return sendSuccess(res, HTTP_STATUS.OK, 'Users fetched successfully', {
      users: users.map(sanitizeUser),
      total: users.length,
    });
  })
);

router.post(
  '/users/:id/reset-password',
  validateAdminPasswordReset,
  asyncHandler(async (req, res) => {
    const user = await repositories.userRepository.getById(req.params.id);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
    }

    const hashedPassword = await hashPassword(req.body.newPassword);
    const updatedUser = await repositories.userRepository.update(req.params.id, {
      password_hash: hashedPassword,
    });

    return sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.PASSWORD_RESET_SUCCESS, {
      user: sanitizeUser(updatedUser),
    });
  })
);

module.exports = router;
