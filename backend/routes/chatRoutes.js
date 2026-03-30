/**
 * @file backend/routes/chatRoutes.js
 * @description Routes factory for chat API endpoints with LLM integration
 */

const express = require('express');
const createChatController = require('../controllers/chatController');
const { verifyJWTToken } = require('../middleware/authMiddleware');

/**
 * Factory function to create chat routes with injected dependencies
 * @param {ChatSessionRepository} chatSessionRepository - Session data access layer
 * @param {EventRepository} eventRepository - Event data access layer
 * @param {RoleRepository} roleRepository - Role data access layer
 * @param {EventRoleRepository} eventRoleRepository - Event-role data access layer
 * @returns {Router} Express router with chat endpoints
 */
const createChatRoutes = (
  chatSessionRepository,
  eventRepository,
  roleRepository,
  eventRoleRepository,
  idempotencyRepository
) => {
  const router = express.Router();
  
  // Validate that repositories are provided
  if (!chatSessionRepository) {
    throw new Error('chatSessionRepository is required for chat routes');
  }
  if (!eventRepository || !roleRepository || !eventRoleRepository) {
    throw new Error('chat route repositories are required');
  }
  
  const chatController = createChatController(
    chatSessionRepository,
    eventRepository,
    roleRepository,
    eventRoleRepository,
    idempotencyRepository
  );

  /**
   * POST /api/chat/session
   * Create new chat session
   * Body: { userId, language? }
   */
  router.post('/session', verifyJWTToken, chatController.createSession);

  /**
   * GET /api/chat/session/:sessionId
   * Get session details
   */
  router.get('/session/:sessionId', verifyJWTToken, chatController.getSession);

  /**
   * POST /api/chat/message
   * Send message to chat
   * Body: { userId, sessionId, message, language? }
   */
  router.post('/message', verifyJWTToken, chatController.sendMessage);

  /**
   * DELETE /api/chat/session/:sessionId
   * Delete chat session
   */
  router.delete('/session/:sessionId', verifyJWTToken, chatController.deleteSession);

  return router;
};

module.exports = createChatRoutes;
