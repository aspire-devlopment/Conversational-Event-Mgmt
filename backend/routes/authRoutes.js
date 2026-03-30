/**
 * File: authRoutes.js
 * Purpose: Authentication API routes
 * Description: Express router for user authentication endpoints:
 *              POST /login, POST /register, POST /logout, GET /me (profile).
 *              Uses JWT for token-based authentication on protected routes.
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { verifyJWTToken } = require('../middleware/authMiddleware');
const createRepositories = require('../data/repositoryFactory');
const AuthService = require('../services/authService');
const createAuthController = require('../controllers/authController');
const {
  validateLogin,
  validateRegister,
} = require('../middleware/requestValidators');

// Initialize repositories and auth service
const repositories = createRepositories();
const authService = new AuthService(repositories.userRepository);
const authController = createAuthController(authService);

// POST /api/auth/login
router.post('/login', validateLogin, asyncHandler(authController.login));

// POST /api/auth/register
router.post('/register', validateRegister, asyncHandler(authController.register));

// POST /api/auth/logout
router.post('/logout', verifyJWTToken, asyncHandler(authController.logout));

// GET /api/auth/me (Protected route - requires valid JWT)
router.get('/me', verifyJWTToken, asyncHandler(authController.getProfile));

module.exports = router;
