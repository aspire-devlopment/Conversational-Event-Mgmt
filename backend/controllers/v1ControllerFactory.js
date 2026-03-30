// CRUD Controller Factory
// Purpose: A generic, reusable factory that creates CRUD controllers for any resource.
// This factory pattern eliminates code duplication by providing standard CRUD operations:
//   - list: Retrieve all items of a resource
//   - getById: Retrieve a single item by ID
//   - create: Create a new item
//   - update: Update an existing item
//   - remove: Delete an item
// The factory accepts a service (for business logic) and resourceLabel (for response messages).
// All routes follow RESTful conventions and return standardized JSON responses.
// This is used for versioned API endpoints (/api/v1/*) with injected services.

/**
 * File: v1ControllerFactory.js
 * Purpose: Generic CRUD controller factory
 * Description: Reusable factory function that generates standard CRUD controllers
 *              for any resource (users, roles, events, chat sessions, etc.).
 *              Eliminates code duplication with generic list, getById, create, update, remove.
 */

const HTTP_STATUS = require('../constants/httpStatus');
const { sendError, sendSuccess } = require('../utils/response');

const createCrudController = (service, resourceLabel) => ({
  list: async (req, res) => {
    const items = await service.list();
    return sendSuccess(res, HTTP_STATUS.OK, `${resourceLabel} fetched`, {
      items,
      total: items.length,
    });
  },

  getById: async (req, res) => {
    const item = await service.getById(req.params.id);
    if (!item) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, `${resourceLabel} not found`);
    }
    return sendSuccess(res, HTTP_STATUS.OK, `${resourceLabel} fetched`, { item });
  },

  create: async (req, res) => {
    const item = await service.create(req.body);
    return sendSuccess(res, HTTP_STATUS.CREATED, `${resourceLabel} created`, { item });
  },

  update: async (req, res) => {
    const item = await service.update(req.params.id, req.body);
    if (!item) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, `${resourceLabel} not found`);
    }
    return sendSuccess(res, HTTP_STATUS.OK, `${resourceLabel} updated`, { item });
  },

  remove: async (req, res) => {
    const deleted = await service.remove(req.params.id);
    if (!deleted) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, `${resourceLabel} not found`);
    }
    return sendSuccess(res, HTTP_STATUS.OK, `${resourceLabel} deleted`);
  },
});

module.exports = createCrudController;

