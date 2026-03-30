// Event Role Controller
// Purpose: Handles HTTP requests for managing M:N relationships between events and roles.
// This controller provides endpoints to:
//   - List all event-role assignments
//   - Assign a role to an event
//   - Unassign a role from an event
// Uses dependency injection to receive eventRoleRepository for data access.

/**
 * File: eventRoleController.js
 * Purpose: Event role assignment request handlers
 * Description: Controller for managing user-to-event role assignments:
 *              list() - get all assignments,
 *              assign() - add user to event with role,
 *              unassign() - remove user from event role.
 */

const HTTP_STATUS = require('../constants/httpStatus');
const { sendSuccess } = require('../utils/response');

const createEventRoleController = (eventRoleRepository) => ({
  list: async (req, res) => {
    const items = await eventRoleRepository.list();
    return sendSuccess(res, HTTP_STATUS.OK, 'event-role mappings fetched', {
      items,
      total: items.length,
    });
  },

  assign: async (req, res) => {
    const { event_id, role_id } = req.body;
    const item = await eventRoleRepository.assign(event_id, role_id);
    return sendSuccess(res, HTTP_STATUS.CREATED, 'role assigned to event', { item });
  },

  unassign: async (req, res) => {
    const { event_id, role_id } = req.body;
    await eventRoleRepository.unassign(event_id, role_id);
    return sendSuccess(res, HTTP_STATUS.OK, 'role unassigned from event');
  },
});

module.exports = createEventRoleController;

