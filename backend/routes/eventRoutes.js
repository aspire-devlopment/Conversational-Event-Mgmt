/**
 * File: eventRoutes.js
 * Purpose: Event management API routes (legacy endpoint)
 * Description: Express router factory for event CRUD operations with duplicate prevention.
 *              GET /all, POST /create (requires JWT), GET /:id, PUT /:id, DELETE /:id.
 *              Implements normalized duplicate-event detection and idempotent create handling.
 */

const express = require('express');
const createEventController = require('../controllers/eventController');
const { createEventIdempotencyMiddleware } = require('../middleware/idempotencyMiddleware');
const {
  validateEventIdParam,
  validateEventPayload,
  createValidateEventDuplicate,
} = require('../middleware/requestValidators');
const { verifyJWTToken } = require('../middleware/authMiddleware');

// Factory function to create routes with injected dependencies
const createEventRoutes = (
  eventRepository,
  roleRepository,
  eventRoleRepository,
  idempotencyRepository
) => {
  const router = express.Router();
  const eventController = createEventController(
    eventRepository,
    roleRepository,
    eventRoleRepository,
    idempotencyRepository
  );
  const validateEventDuplicate = createValidateEventDuplicate(eventRepository);
  const applyEventIdempotency = createEventIdempotencyMiddleware(idempotencyRepository);

  // GET /api/events
  router.get('/', verifyJWTToken, eventController.getAllEvents);

  // POST /api/events - Create event with idempotency and duplicate check
  router.post(
    '/',
    verifyJWTToken,
    applyEventIdempotency,
    validateEventPayload,
    validateEventDuplicate,
    eventController.createEvent
  );

  // GET /api/events/:id
  router.get('/:id', verifyJWTToken, validateEventIdParam, eventController.getEventById);

  // PUT /api/events/:id
  router.put('/:id', verifyJWTToken, validateEventIdParam, eventController.updateEvent);

  // DELETE /api/events/:id
  router.delete('/:id', verifyJWTToken, validateEventIdParam, eventController.deleteEvent);

  return router;
};

// Export the factory function
module.exports = createEventRoutes;
