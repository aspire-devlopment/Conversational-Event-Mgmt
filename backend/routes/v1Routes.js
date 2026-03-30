/**
 * File: v1Routes.js
 * Purpose: Versioned API v1 routes
 * Description: Express router for RESTful API v1 with CRUD endpoints for:
 *              Users, Roles, Events, Chat Sessions, Event Roles.
 *              Uses generic CRUD controller factory pattern for code reuse.
 */

const express = require('express');
const API_PATHS = require('../constants/apiPaths');
const asyncHandler = require('../middleware/asyncHandler');
const {
  requireIdParam,
  validateUserPayload,
  validateRolePayload,
  validateEventPayloadV1,
  validateChatSessionPayload,
  validateEventRolePayload,
} = require('../middleware/v1Validators');

const createRepositories = require('../data/repositoryFactory');

const CrudService = require('../services/crudService');
const createCrudController = require('../controllers/v1ControllerFactory');
const createEventRoleController = require('../controllers/eventRoleController');

const router = express.Router();
const repositories = createRepositories();

const usersController = createCrudController(
  new CrudService(repositories.userRepository),
  'user'
);
const rolesController = createCrudController(
  new CrudService(repositories.roleRepository),
  'role'
);
const eventsController = createCrudController(
  new CrudService(repositories.eventRepository),
  'event'
);
const chatSessionsController = createCrudController(
  new CrudService(repositories.chatSessionRepository),
  'chat session'
);
const eventRoleController = createEventRoleController(
  repositories.eventRoleRepository
);

router.get(API_PATHS.USERS, asyncHandler(usersController.list));
router.get(`${API_PATHS.USERS}/:id`, requireIdParam, asyncHandler(usersController.getById));
router.post(API_PATHS.USERS, validateUserPayload, asyncHandler(usersController.create));
router.put(`${API_PATHS.USERS}/:id`, requireIdParam, asyncHandler(usersController.update));
router.delete(`${API_PATHS.USERS}/:id`, requireIdParam, asyncHandler(usersController.remove));

router.get(API_PATHS.ROLES, asyncHandler(rolesController.list));
router.get(`${API_PATHS.ROLES}/:id`, requireIdParam, asyncHandler(rolesController.getById));
router.post(API_PATHS.ROLES, validateRolePayload, asyncHandler(rolesController.create));
router.put(`${API_PATHS.ROLES}/:id`, requireIdParam, validateRolePayload, asyncHandler(rolesController.update));
router.delete(`${API_PATHS.ROLES}/:id`, requireIdParam, asyncHandler(rolesController.remove));

router.get(API_PATHS.EVENTS, asyncHandler(eventsController.list));
router.get(`${API_PATHS.EVENTS}/:id`, requireIdParam, asyncHandler(eventsController.getById));
router.post(API_PATHS.EVENTS, validateEventPayloadV1, asyncHandler(eventsController.create));
router.put(`${API_PATHS.EVENTS}/:id`, requireIdParam, asyncHandler(eventsController.update));
router.delete(`${API_PATHS.EVENTS}/:id`, requireIdParam, asyncHandler(eventsController.remove));

router.get(API_PATHS.CHAT_SESSIONS, asyncHandler(chatSessionsController.list));
router.get(
  `${API_PATHS.CHAT_SESSIONS}/:id`,
  requireIdParam,
  asyncHandler(chatSessionsController.getById)
);
router.post(
  API_PATHS.CHAT_SESSIONS,
  validateChatSessionPayload,
  asyncHandler(chatSessionsController.create)
);
router.put(
  `${API_PATHS.CHAT_SESSIONS}/:id`,
  requireIdParam,
  asyncHandler(chatSessionsController.update)
);
router.delete(
  `${API_PATHS.CHAT_SESSIONS}/:id`,
  requireIdParam,
  asyncHandler(chatSessionsController.remove)
);

router.get(API_PATHS.EVENT_ROLES, asyncHandler(eventRoleController.list));
router.post(
  `${API_PATHS.EVENT_ROLES}/assign`,
  validateEventRolePayload,
  asyncHandler(eventRoleController.assign)
);
router.post(
  `${API_PATHS.EVENT_ROLES}/unassign`,
  validateEventRolePayload,
  asyncHandler(eventRoleController.unassign)
);

module.exports = router;

