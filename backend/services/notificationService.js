/**
 * File: notificationService.js
 * Purpose: Email notification orchestration service
 * Description: High-level service that:
 *              - Gets users for event roles
 *              - Formats event data for email
 *              - Queues emails for delivery
 *              - Handles errors gracefully
 *              - Logs all notifications
 *
 * Architecture:
 * - Repository layer: Gets users by roles
 * - Template layer: Formats email content
 * - Queue layer: Adds jobs to Bull queue
 * - Error handling: Fails gracefully without stopping event creation
 *
 * Integration Points:
 * - Called from: eventController.js (after event creation)
 * - Called from: chatController.js (after chat confirmation)
 * - Uses: userRepository, notificationRepository
 * - Queues to: queueService (Bull + Redis)
 *
 * Usage:
 *   const notificationService = require('./notificationService');
 *   await notificationService.notifyRoleUsersOfEvent(event, eventRoles);
 *
 * Design Principles:
 * - Non-blocking: Notifications queued, don't block event creation
 * - Resilient: Failures logged but don't fail the request
 * - Scalable: Uses queue for distributed processing
 * - Auditable: All notifications logged for compliance
 */

const queueService = require('./queueService');
const logger = require('./loggingService');
const emailConfig = require('../constants/emailConfig');

/**
 * NotificationService class
 * Depends on repositories being injected
 * Allows for flexibility and testing
 */
class NotificationService {
  /**
   * Constructor
   * @param {object} repositories - Injected repository instances
   *   @param {object} repositories.userRepository - User data access
   *   @param {object} repositories.roleRepository - Role data access
   *   @param {object} repositories.eventRepository - Event data access
   */
  constructor(repositories = {}) {
    this.userRepository = repositories.userRepository || null;
    this.roleRepository = repositories.roleRepository || null;
    this.eventRepository = repositories.eventRepository || null;
  }

  /**
   * Notify all users of specified roles about new event
   * Main orchestration method - coordinates entire notification flow
   *
   * Flow:
   * 1. Get role IDs from role names (Admin, Manager, etc.)
   * 2. Get all users with those roles
   * 3. Format email for each user
   * 4. Queue email for delivery
   * 5. Log results
   * 6. Return summary
   *
   * Error Handling:
   * - If queue fails: Logged but doesn't throw
   * - If user lookup fails: Logged but continues
   * - If email format fails: User skipped, continues
   * - Graceful degradation: Partial notifications acceptable
   *
   * @param {object} event - Event object (from database)
   *   @param {number} event.id - Event ID
   *   @param {string} event.name - Event name
   *   @param {string} event.description - Event description
   *   @param {string} event.start_time - Start timestamp
   *   @param {string} event.end_time - End timestamp
   *   @param {string} event.timezone - Timezone
   * @param {array} roleNames - Array of role names (e.g., ['Admin', 'Manager'])
   *   @param {string} roleNames[] - Individual role name
   *
   * @returns {Promise<object>} Notification result summary
   *   @returns {boolean} result.success - Overall success status
   *   @returns {number} result.queued - Emails successfully queued
   *   @returns {number} result.failed - Emails that failed to queue
   *   @returns {array} result.errors - List of errors encountered
   *
   * @throws Will NOT throw - returns error in result object
   *
   * Example:
   *   const result = await notificationService.notifyRoleUsersOfEvent(
   *     { id: 1, name: 'Tech Conference', ... },
   *     ['Admin', 'Manager']
   *   );
   *   console.log(`Queued ${result.queued} emails`);
   */
  async notifyRoleUsersOfEvent(event, roleNames = []) {
    /**
     * Initialize result tracking
     * Tracks queued count, failed count, errors
     */
    const result = {
      success: false,
      queued: 0,
      failed: 0,
      errors: [],
      eventId: event?.id,
    };

    try {
      /**
       * Validate inputs
       */
      if (!event || !event.id) {
        result.errors.push('Event object missing or invalid');
        logger.error('[NotificationService] Invalid event object', { event });
        return result;
      }

      if (!Array.isArray(roleNames) || roleNames.length === 0) {
        logger.info('[NotificationService] No roles specified, skipping notifications', {
          eventId: event.id,
          roleNames,
        });
        result.success = true; // Not an error, just no notifications to send
        return result;
      }

      logger.info('[NotificationService] Starting event notification', {
        eventId: event.id,
        eventName: event.name,
        roles: roleNames,
      });

      /**
       * Get users for specified roles
       * Fetches all users where role is in roleNames array
       * Returns: [{ id, email, first_name, role_id, role_name }, ...]
       */
      let users = [];
      try {
        if (!this.userRepository) {
          throw new Error('userRepository not injected');
        }

        users = await this.userRepository.getUsersByRoleNamesForNotification(roleNames);

        logger.info('[NotificationService] Users found for roles', {
          roleCount: roleNames.length,
          userCount: users.length,
          roles: roleNames,
        });
      } catch (error) {
        result.errors.push(`Failed to fetch users for roles: ${error.message}`);
        logger.error('[NotificationService] Failed to get users by roles', {
          error: error.message,
          roles: roleNames,
        });
        return result;
      }

      /**
       * If no users found for roles, that's fine
       * Just log and return success (no one to notify)
       */
      if (users.length === 0) {
        logger.info('[NotificationService] No users found for specified roles', {
          eventId: event.id,
          roles: roleNames,
        });
        result.success = true;
        return result;
      }

      /**
       * Queue email for each user
       * Batched async operations with error handling per user
       */
      const queuePromises = users.map((user) =>
        this.queueEmailForUser(event, user, roleNames).catch((error) => {
          /**
           * Catch per-user errors
           * Prevents one failure from stopping other notifications
           */
          result.failed++;
          result.errors.push(
            `Failed to queue email for user ${user.id} (${user.email}): ${error.message}`
          );
          logger.error('[NotificationService] Failed to queue email for user', {
            userId: user.id,
            userEmail: user.email,
            eventId: event.id,
            error: error.message,
          });
        })
      );

      /**
       * Wait for all queue operations
       * Uses Promise.allSettled for resilience
       * Doesn't throw even if some fail
       */
      const queueResults = await Promise.allSettled(queuePromises);

      /**
       * Count successes from results
       * Each fulfilled promise = 1 email queued
       */
      queueResults.forEach((queueResult) => {
        if (queueResult.status === 'fulfilled') {
          result.queued++;
        }
      });

      /**
       * Determine overall success
       * Success if at least one email queued and no critical errors
       */
      result.success = result.queued > 0 || result.errors.length === 0;

      /**
       * Log notification summary
       */
      logger.info('[NotificationService] Event notification complete', {
        eventId: event.id,
        eventName: event.name,
        totalUsers: users.length,
        queued: result.queued,
        failed: result.failed,
        success: result.success,
      });

      return result;
    } catch (error) {
      /**
       * Catch-all error handler
       * Unexpected errors logged but not thrown
       */
      result.errors.push(`Unexpected error during notification: ${error.message}`);
      logger.error('[NotificationService] Unexpected error', {
        error: error.message,
        stack: error.stack,
        eventId: event?.id,
      });

      return result;
    }
  }

  /**
   * Queue email notification for a single user
   * Helper method called for each user
   * Formats email content and adds to queue
   *
   * @param {object} event - Event object
   * @param {object} user - User object { id, email, first_name, role_name }
   * @param {array} roleNames - All role names (for email context)
   * @returns {Promise<object>} Queue job result
   * @private
   */
  async queueEmailForUser(event, user, roleNames) {
    try {
      /**
       * Validate user has email
       */
      if (!user || !user.email) {
        throw new Error('User email missing');
      }

      /**
       * Format email subject
       * Template: "New Event Created: {{eventName}}"
       */
      const subject = `New Event Created: ${event.name}`;

      /**
       * Format email body with event details
       * Includes: event name, description, time, timezone, roles
       */
      const emailData = {
        eventId: event.id,
        eventName: event.name,
        eventSubheading: event.subheading || '',
        eventDescription: event.description || '',
        eventStartTime: this.formatDateTime(event.start_time, event.timezone),
        eventEndTime: this.formatDateTime(event.end_time, event.timezone),
        eventTimezone: event.timezone || 'Unknown',
        userRole: user.role_name || 'Team Member',
        userName: user.first_name || 'User',
        eventLink: `${process.env.APP_URL || 'http://localhost:3000'}/events/${event.id}`,
      };

      /**
       * Generate HTML email body
       * Simple HTML template with event details
       */
      const htmlContent = this.generateEmailHtml(emailData);

      /**
       * Generate plain text version
       * Fallback for clients that don't support HTML
       */
      const textContent = this.generateEmailText(emailData);

      /**
       * Add email job to queue
       * Job will be processed by queueWorker
       * Metadata used for tracking and monitoring
       */
      const job = await queueService.addEmailJob(
        user.email,
        subject,
        htmlContent,
        textContent,
        {
          eventId: event.id,
          userId: user.id,
          userRole: user.role_name,
        }
      );

      logger.debug('[NotificationService] Email queued for user', {
        jobId: job.id,
        userId: user.id,
        userEmail: user.email,
        eventId: event.id,
      });

      // Persist tracking record if repository available
      try {
        if (this.emailNotificationRepository && typeof this.emailNotificationRepository.recordEmailQueued === 'function') {
          await this.emailNotificationRepository.recordEmailQueued(
            event.id,
            user.id,
            user.email,
            subject,
            user.role_name,
            user.first_name || null,
            job.id,
            { template: 'eventCreated', roleNames }
          );
        }
      } catch (dbErr) {
        logger.error('[NotificationService] Failed to record queued email', {
          userId: user.id,
          eventId: event.id,
          error: dbErr.message,
        });
        // don't throw - tracking failures should not stop notifications
      }
      return job;
    } catch (error) {
      logger.error('[NotificationService] Error queueing email for user', {
        userId: user?.id,
        userEmail: user?.email,
        eventId: event?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate HTML email body
   * Creates professional HTML email with event details
   *
   * @param {object} data - Email template variables
   * @returns {string} HTML email content
   * @private
   */
  generateEmailHtml(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; }
        .event-details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #007bff; }
        .detail-row { margin: 8px 0; }
        .label { font-weight: bold; color: #555; }
        .cta-button { 
            background: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 15px 0;
        }
        .footer { text-align: center; color: #999; font-size: 12px; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Event Created</h1>
        </div>
        <div class="content">
            <p>Hello ${data.userName},</p>
            <p>A new event has been created that is relevant to your role as <strong>${data.userRole}</strong>.</p>
            
            <div class="event-details">
                <h2>${data.eventName}</h2>
                <p><strong>${data.eventSubheading}</strong></p>
                <p>${data.eventDescription}</p>
                
                <div class="detail-row">
                    <span class="label">Start:</span> ${data.eventStartTime}
                </div>
                <div class="detail-row">
                    <span class="label">End:</span> ${data.eventEndTime}
                </div>
                <div class="detail-row">
                    <span class="label">Timezone:</span> ${data.eventTimezone}
                </div>
            </div>
            
            <p>
                <a href="${data.eventLink}" class="cta-button">View Event Details</a>
            </p>
            
            <p>Best regards,<br><strong>Event Management System</strong></p>
        </div>
        <div class="footer">
            <p>© 2026 Event Management System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text email body
   * Text version for clients without HTML support
   *
   * @param {object} data - Email template variables
   * @returns {string} Plain text email content
   * @private
   */
  generateEmailText(data) {
    return `
NEW EVENT CREATED

Hello ${data.userName},

A new event has been created that is relevant to your role as ${data.userRole}.

EVENT DETAILS
=============
Name: ${data.eventName}
Subtitle: ${data.eventSubheading}
Description: ${data.eventDescription}

Start: ${data.eventStartTime}
End: ${data.eventEndTime}
Timezone: ${data.eventTimezone}

VIEW EVENT: ${data.eventLink}

Best regards,
Event Management System

© 2026 Event Management System. All rights reserved.
    `;
  }

  /**
   * Format date/time with timezone
   * Converts database timestamp to readable format
   *
   * @param {string} timestamp - ISO timestamp
   * @param {string} timezone - Timezone name
   * @returns {string} Formatted date/time string
   * @private
   */
  formatDateTime(timestamp, timezone) {
    if (!timestamp) return 'Unknown';

    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone || 'UTC',
      });
    } catch (error) {
      logger.warn('[NotificationService] Failed to format date', {
        timestamp,
        timezone,
        error: error.message,
      });
      return timestamp;
    }
  }

  /**
   * Set repositories (dependency injection)
   * Called from server.js during initialization
   *
   * @param {object} repositories - Repository instances
   */
  setRepositories(repositories) {
    this.userRepository = repositories.userRepository || this.userRepository;
    this.roleRepository = repositories.roleRepository || this.roleRepository;
    this.eventRepository = repositories.eventRepository || this.eventRepository;
    this.emailNotificationRepository = repositories.emailNotificationRepository || this.emailNotificationRepository;
  }
}

/**
 * Export singleton instance
 * Can be required and used directly
 * Repositories set via setRepositories()
 */
module.exports = new NotificationService();
