// Event Controller (Legacy)
// Purpose: Handles HTTP requests for event management operations.
// NOTE: REFACTORED to use database-backed event repository instead of in-memory storage
// This controller now provides real persistence and duplicate detection
// Uses dependency injection to receive eventRepository for database operations

/**
 * File: eventController.js
 * Purpose: Event management request handlers (database-backed)
 * Description: Controller factory for event CRUD operations:
 *              list(), getById(), create(), update(), remove().
 *              Refactored to use database repository instead of in-memory storage.
 *              Supports user ID extraction from JWT tokens.
 */

const HTTP_STATUS = require('../constants/httpStatus');
const MESSAGES = require('../constants/messages');
const { sendError, sendSuccess } = require('../utils/response');

function normalizeRoleName(role) {
  // Normalize role names so access checks are case-insensitive and predictable.
  return String(role || '').trim().toLowerCase();
}

function eventHasRole(event, roleName) {
  // A user can see an event when the event is explicitly tagged with their role.
  const target = normalizeRoleName(roleName);
  if (!target) return false;
  return (Array.isArray(event?.roles) ? event.roles : []).some(
    (role) => normalizeRoleName(role) === target
  );
}

function canUserAccessEvent(event, user) {
  // Admin sees everything; other users see their own events or events tagged for their role.
  const userRole = normalizeRoleName(user?.role);
  const userId = Number(user?.id);
  const createdBy = Number(event?.created_by);

  if (!event) return false;
  if (userRole === 'admin') return true;
  if (createdBy && createdBy === userId) return true;
  if (!userRole) return false;

  return eventHasRole(event, userRole);
}

const createEventController = (
  eventRepository,
  roleRepository,
  eventRoleRepository,
  idempotencyRepository
) => ({
  getAllEvents: async (req, res, next) => {
    try {
      const user = req.user;
      const allEvents = await eventRepository.list();

      // Filter the full list after loading so the same access rule is used everywhere.
      const events = allEvents.filter((event) => canUserAccessEvent(event, user));
      
      return sendSuccess(res, HTTP_STATUS.OK, undefined, {
        events,
        total: events.length,
      });
    } catch (error) {
      return next(error);
    }
  },

  getEventById: async (req, res, next) => {
    try {
      const event = await eventRepository.getById(req.params.id);
      if (!event) {
        return sendError(res, HTTP_STATUS.NOT_FOUND, MESSAGES.EVENTS.EVENT_NOT_FOUND);
      }
      
      if (!canUserAccessEvent(event, req.user)) {
        return sendError(res, HTTP_STATUS.FORBIDDEN, 'You cannot view this event');
      }
      
      return sendSuccess(res, HTTP_STATUS.OK, undefined, { event });
    } catch (error) {
      return next(error);
    }
  },

  createEvent: async (req, res, next) => {
    try {
      // Only Admin can create events
      if (req.user?.role !== 'Admin') {
        return sendError(res, HTTP_STATUS.FORBIDDEN, 'Only admins can create events');
      }
      
      const payload = req.body;
      if (req.user?.id) {
        payload.created_by = req.user.id;
      }
      const hydratedEvent = await eventRepository.createWithRoles(payload, payload.roles);
      if (!hydratedEvent) {
        return sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.EVENTS.CREATE_FAILED);
      }
      const responseBody = {
        status: 'success',
        message: MESSAGES.EVENTS.CREATE_SUCCESS,
        data: { event: hydratedEvent },
      };

      return res.status(HTTP_STATUS.CREATED).json(responseBody);
    } catch (error) {
      return next(error);
    }
  },

  updateEvent: async (req, res, next) => {
    try {
      // Only Admin can update events
      if (req.user?.role !== 'Admin') {
        return sendError(res, HTTP_STATUS.FORBIDDEN, 'Only admins can update events');
      }
      
      const event = await eventRepository.updateWithRoles(
        req.params.id,
        req.body,
        Array.isArray(req.body.roles) ? req.body.roles : null
      );
      if (!event) {
        return sendError(res, HTTP_STATUS.NOT_FOUND, MESSAGES.EVENTS.EVENT_NOT_FOUND);
      }
      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        MESSAGES.EVENTS.UPDATE_SUCCESS,
        { event }
      );
    } catch (error) {
      return next(error);
    }
  },

  deleteEvent: async (req, res, next) => {
    try {
      // Only Admin can delete events
      if (req.user?.role !== 'Admin') {
        return sendError(res, HTTP_STATUS.FORBIDDEN, 'Only admins can delete events');
      }
      
      const deleted = await eventRepository.remove(req.params.id);
      if (!deleted) {
        return sendError(res, HTTP_STATUS.NOT_FOUND, MESSAGES.EVENTS.EVENT_NOT_FOUND);
      }
      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        MESSAGES.EVENTS.DELETE_SUCCESS
      );
    } catch (error) {
      return next(error);
    }
  },
});

module.exports = createEventController;
