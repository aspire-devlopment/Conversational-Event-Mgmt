/**
 * File: authService.js
 * Purpose: Authentication business logic
 * Description: Service class for user authentication operations:
 *              login() - authenticate user and generate JWT token,
 *              register() - create new user with validation,
 *              logout() - invalidate token,
 *              getProfile() - retrieve user from JWT token.
 *              Uses JWT tokens with HS256 algorithm.
 */

const MESSAGES = require('../constants/messages');
const { normalizeEmail } = require('../utils/validation');
const JWTTokenService = require('../utils/jwtToken');
const { hashPassword, comparePassword } = require('../utils/passwordService');
const { VALID_USER_ROLES } = require('../constants/appConfig');

class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  sanitizeUser(user) {
    const result = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.contact_number,
      role: user.role,
    };

    delete result.password;
    delete result.password_hash;
    return result;
  }

  async login(email, password) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      const error = new Error(MESSAGES.AUTH.INVALID_CREDENTIALS);
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      const error = new Error(MESSAGES.AUTH.INVALID_CREDENTIALS);
      error.statusCode = 401;
      throw error;
    }

    const token = JWTTokenService.generateToken({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    });

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  async register(payload) {
    try {
      const { email, firstName, lastName, phone, password, role } = payload;

      if (!email || !password) {
        const error = new Error('Email and password are required');
        error.statusCode = 400;
        throw error;
      }

      const normalizedEmail = normalizeEmail(email);

      if (!VALID_USER_ROLES.includes(role)) {
        const error = new Error(MESSAGES.AUTH.INVALID_ROLE);
        error.statusCode = 400;
        throw error;
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await this.userRepository.create({
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        contact_number: phone,
        password_hash: hashedPassword,
        role,
      });

      if (!newUser) {
        const error = new Error(
          'Registration failed because the selected role is not available in the database'
        );
        error.statusCode = 500;
        throw error;
      }

      const token = JWTTokenService.generateToken({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
      });

      return {
        token,
        user: this.sanitizeUser(newUser),
      };
    } catch (error) {
      if (error.message?.includes('unique constraint')) {
        error.message = MESSAGES.AUTH.EMAIL_EXISTS;
        error.statusCode = 409;
      }
      throw error;
    }
  }

  logout(token) {
    try {
      JWTTokenService.verifyToken(token);
      return true;
    } catch {
      return false;
    }
  }

  async getProfile(token) {
    const decoded = JWTTokenService.verifyToken(token);
    return {
      id: decoded.id,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role,
    };
  }
}

module.exports = AuthService;
