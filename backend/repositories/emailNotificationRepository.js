/**
 * File: emailNotificationRepository.js
 * Purpose: Data access layer for email notification tracking
 * Description: Repository class for email_notifications table operations
 *              Provides methods to:
 *              - Record email send attempts in database
 *              - Track success/failure status
 *              - Manage retry attempts
 *              - Query notification history
 *              - Generate reports and metrics
 *
 * Usage:
 *   const repo = new EmailNotificationRepository(dataContext);
 *   
 *   // After email send attempt
 *   await repo.recordEmailSent(eventId, userId, recipientEmail, 'sent');
 *   
 *   // Find failed emails to retry
 *   const failed = await repo.getPendingRetries();
 *   
 *   // Update retry status
 *   await repo.recordEmailAttempt(notificationId, 'failed', 'SMTP timeout');
 *
 * Database Schema: email_notifications table
 * - Tracks every email sent to users
 * - Records status: pending, sent, failed, bounced, complained
 * - Enables retry management and audit trail
 */

class EmailNotificationRepository {
  /**
   * Constructor
   * @param {object} dataContext - Database connection context (from pool)
   */
  constructor(dataContext) {
    this.dataContext = dataContext;
  }

  /**
   * Create initial notification record
   * Purpose: Log when email job is added to queue (before sending)
   * Called by: notificationService when queuing emails
   * Status: 'pending' initially
   *
   * @param {number} eventId - Event ID
   * @param {number} userId - User ID receiving email
   * @param {string} recipientEmail - Email address
   * @param {string} emailSubject - Email subject line
   * @param {string} roleName - User's role name
   * @param {string} userFirstName - User's first name
   * @param {string} queueJobId - Bull queue job ID for correlation
   * @param {object} metadata - Additional data (optional)
   *
   * @returns {Promise<object>} Created notification record
   *
   * Example:
   *   const notification = await repo.recordEmailQueued(
   *     eventId: 123,
   *     userId: 456,
   *     recipientEmail: 'user@example.com',
   *     emailSubject: 'New Event: Tech Conference',
   *     roleName: 'Admin',
   *     userFirstName: 'John',
   *     queueJobId: 'job-id-123',
   *     metadata: { templateId: 'eventCreated' }
   *   );
   */
  async recordEmailQueued(
    eventId,
    userId,
    recipientEmail,
    emailSubject,
    roleName,
    userFirstName,
    queueJobId,
    metadata = {}
  ) {
    const q = `
      INSERT INTO email_notifications (
        event_id, user_id, recipient_email, email_subject, 
        role_name, user_first_name, user_email_at_send,
        queue_job_id, status, attempt_count, first_attempt_at, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
      RETURNING *
    `;

    const values = [
      eventId,
      userId,
      recipientEmail,
      emailSubject,
      roleName,
      userFirstName,
      recipientEmail,
      queueJobId,
      'pending',
      0,
      JSON.stringify(metadata),
    ];

    try {
      const rows = await this.dataContext.query(q, values);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to record queued email: ${error.message}`);
    }
  }

  /**
   * Record successful email send
   * Purpose: Update notification status to 'sent' after successful delivery
   * Called by: queueWorker when emailService.sendEmail() succeeds
   * Status: changes from 'pending' to 'sent'
   *
   * @param {number} notificationId - Notification record ID
   * @param {string} smtpResponse - SMTP server response
   * @param {string} providerMessageId - Message ID from email provider (optional)
   * @param {string} jobId - Queue job ID
   *
   * @returns {Promise<object>} Updated notification record
   *
   * Example:
   *   await repo.recordEmailSent(
   *     notificationId: 789,
   *     smtpResponse: '250 OK: Message queued',
   *     providerMessageId: '<msg-id@sendgrid.com>',
   *     jobId: 'job-123'
   *   );
   */
  async recordEmailSent(notificationId, smtpResponse, providerMessageId, jobId) {
    const q = `
      UPDATE email_notifications
      SET 
        status = 'sent',
        sent_at = NOW(),
        last_attempt_at = NOW(),
        smtp_response = $2,
        provider_message_id = $3,
        attempt_count = attempt_count + 1
      WHERE id = $1
      RETURNING *
    `;

    try {
      const rows = await this.dataContext.query(q, [
        notificationId,
        smtpResponse || null,
        providerMessageId || null,
      ]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to record email sent: ${error.message}`);
    }
  }

  /**
   * Record failed email send attempt
   * Purpose: Log email send failure and schedule retry
   * Called by: queueWorker when emailService.sendEmail() fails
   * Status: remains 'pending' if retry scheduled, changed to 'failed' if retries exhausted
   *
   * @param {number} notificationId - Notification record ID
   * @param {string} errorMessage - Error description
   * @param {string} errorCode - SMTP error code (optional)
   * @param {string} errorStack - Full error stack trace (optional)
   * @param {number} nextRetryDelayMs - Milliseconds until next retry (optional)
   *
   * @returns {Promise<object>} Updated notification record
   *
   * Example:
   *   await repo.recordEmailFailed(
   *     notificationId: 789,
   *     errorMessage: 'Connection timeout',
   *     errorCode: 'ETIMEDOUT',
   *     nextRetryDelayMs: 5000
   *   );
   */
  async recordEmailFailed(
    notificationId,
    errorMessage,
    errorCode = null,
    errorStack = null,
    nextRetryDelayMs = 5000
  ) {
    /**
     * Determine new status based on retry count
     * - If more retries available: keep 'pending', schedule next retry
     * - If max retries exhausted: change to 'failed', no more retries
     */
    const q = `
      UPDATE email_notifications
      SET 
        status = CASE 
          WHEN attempt_count + 1 >= max_attempts THEN 'failed'
          ELSE 'pending'
        END,
        last_attempt_at = NOW(),
        last_error = $2,
        last_error_code = $3,
        error_stack = CASE 
          WHEN $4::TEXT IS NOT NULL THEN $4 
          ELSE error_stack 
        END,
        next_retry_at = CASE
          WHEN attempt_count + 1 >= max_attempts THEN NULL
          ELSE NOW() + INTERVAL '1 millisecond' * $5
        END,
        attempt_count = attempt_count + 1,
        metadata = JSONB_SET(
          COALESCE(metadata, '{}'::JSONB),
          '{last_retry}',
          to_jsonb(NOW())
        )
      WHERE id = $1
      RETURNING *
    `;

    try {
      const rows = await this.dataContext.query(q, [
        notificationId,
        errorMessage,
        errorCode,
        errorStack,
        nextRetryDelayMs,
      ]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to record email failure: ${error.message}`);
    }
  }

  /**
   * Get pending retries
   * Purpose: Find all failed emails that are ready for retry
   * Called by: Retry scheduler/worker
   * Query: status='failed' AND attempt_count < max_attempts AND next_retry_at <= NOW()
   *
   * @param {number} limit - Maximum records to return (default: 100)
   *
   * @returns {Promise<array>} Array of notification records ready for retry
   *
   * Example:
   *   const pendingRetries = await repo.getPendingRetries(50);
   *   pendingRetries.forEach(notification => {
   *     console.log(`Retry: ${notification.recipient_email}`);
   *   });
   */
  async getPendingRetries(limit = 100) {
    const q = `
      SELECT *
      FROM email_notifications
      WHERE status = 'failed'
        AND attempt_count < max_attempts
        AND next_retry_at IS NOT NULL
        AND next_retry_at <= NOW()
      ORDER BY next_retry_at ASC
      LIMIT $1
    `;

    try {
      const rows = await this.dataContext.query(q, [limit]);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get pending retries: ${error.message}`);
    }
  }

  /**
   * Get notifications by event
   * Purpose: Find all email notifications for a specific event
   * Called by: Event investigation, metrics dashboard
   * Query: event_id = ?
   *
   * @param {number} eventId - Event ID to filter by
   *
   * @returns {Promise<array>} Array of notification records for event
   *
   * Example:
   *   const eventNotifications = await repo.getNotificationsByEvent(123);
   *   console.log(`Event 123: ${eventNotifications.length} emails`);
   */
  async getNotificationsByEvent(eventId) {
    const q = `
      SELECT *
      FROM email_notifications
      WHERE event_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const rows = await this.dataContext.query(q, [eventId]);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get notifications by event: ${error.message}`);
    }
  }

  /**
   * Get notifications by user
   * Purpose: Find all email notifications received by a specific user
   * Called by: User history, preferences, support
   * Query: user_id = ?
   *
   * @param {number} userId - User ID to filter by
   * @param {number} limit - Maximum records (default: 100)
   *
   * @returns {Promise<array>} Array of notification records for user
   *
   * Example:
   *   const userNotifications = await repo.getNotificationsByUser(456, 50);
   *   userNotifications.forEach(n => {
   *     console.log(`${n.created_at}: ${n.email_subject} - ${n.status}`);
   *   });
   */
  async getNotificationsByUser(userId, limit = 100) {
    const q = `
      SELECT *
      FROM email_notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    try {
      const rows = await this.dataContext.query(q, [userId, limit]);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get notifications by user: ${error.message}`);
    }
  }

  /**
   * Get failed notifications
   * Purpose: Find all emails that failed to send
   * Called by: Support, monitoring dashboard, troubleshooting
   * Query: status = 'failed'
   *
   * @param {number} limit - Maximum records (default: 100)
   *
   * @returns {Promise<array>} Array of failed notification records
   *
   * Example:
   *   const failed = await repo.getFailedNotifications(50);
   *   console.log(`${failed.length} emails failed to send`);
   */
  async getFailedNotifications(limit = 100) {
    const q = `
      SELECT *
      FROM email_notifications
      WHERE status = 'failed'
      ORDER BY last_attempt_at DESC
      LIMIT $1
    `;

    try {
      const rows = await this.dataContext.query(q, [limit]);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get failed notifications: ${error.message}`);
    }
  }

  /**
   * Get notification by ID
   * Purpose: Retrieve a single notification record for inspection
   * Called by: Support, investigation, retry workflows
   *
   * @param {number} id - Notification ID
   *
   * @returns {Promise<object>} Notification record or null
   *
   * Example:
   *   const notification = await repo.getNotificationById(789);
   *   console.log(`Status: ${notification.status}`);
   *   console.log(`Error: ${notification.last_error}`);
   */
  async getNotificationById(id) {
    const q = `
      SELECT * FROM email_notifications
      WHERE id = $1
    `;

    try {
      const rows = await this.dataContext.query(q, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to get notification: ${error.message}`);
    }
  }

  /**
   * Get notification by queue job id
   * Purpose: Find the notification record that corresponds to a Bull job id
   * Called by: queueWorker after job processing to update status
   *
   * @param {string|number} queueJobId - Bull job id
   * @returns {Promise<object|null>} Notification record or null
   */
  async getNotificationByQueueJobId(queueJobId) {
    const q = `
      SELECT * FROM email_notifications
      WHERE queue_job_id = $1
      LIMIT 1
    `;

    try {
      const rows = await this.dataContext.query(q, [String(queueJobId)]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to get notification by queue job id: ${error.message}`);
    }
  }

  /**
   * Check if at least one successful email was already sent for an event.
   * Used to prevent accidental duplicate mass-notifications.
   * @param {number} eventId
   * @returns {Promise<boolean>}
   */
  async hasSuccessfulNotificationForEvent(eventId) {
    const q = `
      SELECT EXISTS(
        SELECT 1
        FROM email_notifications
        WHERE event_id = $1
          AND status = 'sent'
      ) AS sent
    `;

    const rows = await this.dataContext.query(q, [eventId]);
    return Boolean(rows?.[0]?.sent);
  }

  /**
   * Get summary statistics
   * Purpose: Get high-level metrics for dashboard and monitoring
   * Query: Count by status, calculate success rates
   *
   * @returns {Promise<object>} Statistics object
   *   {
   *     total: number,
   *     sent: number,
   *     failed: number,
   *     pending: number,
   *     success_rate: percentage,
   *     last_24h: {...}
   *   }
   *
   * Example:
   *   const stats = await repo.getStatistics();
   *   console.log(`Success rate: ${stats.success_rate}%`);
   */
  async getStatistics() {
    const q = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        ROUND(
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100,
          2
        ) as success_rate
      FROM email_notifications
    `;

    try {
      const rows = await this.dataContext.query(q);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * Get statistics for last 24 hours
   * Purpose: Recent activity monitoring
   *
   * @returns {Promise<object>} Last 24h statistics
   *
   * Example:
   *   const recent = await repo.getStatisticsLastDay();
   *   console.log(`Sent today: ${recent.sent}`);
   */
  async getStatisticsLastDay() {
    const q = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM email_notifications
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;

    try {
      const rows = await this.dataContext.query(q);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to get last day statistics: ${error.message}`);
    }
  }

  /**
   * Get event delivery summary
   * Purpose: See delivery status for each event
   * Query: Group by event_id, count by status
   *
   * @param {number} limit - Maximum events (default: 100)
   *
   * @returns {Promise<array>} Event delivery statistics
   *   Each row: { event_id, total, sent, failed, pending, success_rate }
   *
   * Example:
   *   const events = await repo.getEventDeliverySummary(50);
   *   events.forEach(e => {
   *     console.log(`Event ${e.event_id}: ${e.success_rate}% success`);
   *   });
   */
  async getEventDeliverySummary(limit = 100) {
    const q = `
      SELECT
        event_id,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        ROUND(
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::NUMERIC / 
          COUNT(*) * 100,
          2
        ) as success_rate
      FROM email_notifications
      GROUP BY event_id
      ORDER BY event_id DESC
      LIMIT $1
    `;

    try {
      const rows = await this.dataContext.query(q, [limit]);
      return rows || [];
    } catch (error) {
      throw new Error(`Failed to get event delivery summary: ${error.message}`);
    }
  }

  /**
   * Manually retry a failed notification
   * Purpose: Allow support/ops to retry specific failed emails
   * Called by: Support dashboard, retry scheduler
   * Action: Reset status to 'pending', clear retry time
   *
   * @param {number} notificationId - Notification ID to retry
   * @param {number} attemptCount - Reset attempt count (default: 0)
   *
   * @returns {Promise<object>} Updated notification record
   *
   * Example:
   *   // Retry an email (reset attempt counter)
   *   await repo.manuallyRetry(789);
   *   
   *   // Retry but only allow 1 more attempt
   *   await repo.manuallyRetry(789, 2);
   */
  async manuallyRetry(notificationId, attemptCount = 0) {
    const q = `
      UPDATE email_notifications
      SET 
        status = 'pending',
        attempt_count = $2,
        next_retry_at = NOW(),
        last_error = NULL,
        last_error_code = NULL,
        metadata = JSONB_SET(
          COALESCE(metadata, '{}'::JSONB),
          '{manually_retried_at}',
          to_jsonb(NOW())
        )
      WHERE id = $1
      RETURNING *
    `;

    try {
      const rows = await this.dataContext.query(q, [notificationId, attemptCount]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to manually retry notification: ${error.message}`);
    }
  }

  /**
   * Mark notification as bounced
   * Purpose: Record that email provider returned bounce/delivery failure
   * Called by: Webhook handler from email provider (SendGrid, etc.)
   * Status: changed to 'bounced'
   *
   * @param {number} notificationId - Notification ID
   * @param {string} providerResponse - Response from email provider
   *
   * @returns {Promise<object>} Updated notification record
   *
   * Example:
   *   await repo.markAsBounced(789, 'Permanent bounce: User not found');
   */
  async markAsBounced(notificationId, providerResponse) {
    const q = `
      UPDATE email_notifications
      SET 
        status = 'bounced',
        provider_status = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const rows = await this.dataContext.query(q, [notificationId, providerResponse]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to mark as bounced: ${error.message}`);
    }
  }

  /**
   * Delete old records (cleanup)
   * Purpose: Remove old records to save database space
   * Called by: Maintenance scripts (not automatic)
   * Caution: Deletes permanently, consider archiving first
   *
   * @param {number} daysOld - Delete records older than this many days
   *
   * @returns {Promise<number>} Number of records deleted
   *
   * Example:
   *   // Delete records older than 1 year
   *   const deleted = await repo.deleteOldRecords(365);
   *   console.log(`Deleted ${deleted} records`);
   */
  async deleteOldRecords(daysOld = 365) {
    const q = `
      DELETE FROM email_notifications
      WHERE created_at < NOW() - INTERVAL '1 day' * $1
        AND status IN ('sent', 'bounced', 'complained')
    `;

    try {
      const result = await this.dataContext.execute(q, [daysOld]);
      return result.rowCount;
    } catch (error) {
      throw new Error(`Failed to delete old records: ${error.message}`);
    }
  }
}

module.exports = EmailNotificationRepository;
