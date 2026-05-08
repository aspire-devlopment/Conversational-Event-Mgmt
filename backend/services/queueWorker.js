/**
 * File: queueWorker.js
 * Purpose: Bull queue job processor for email sending
 * Description: Background worker that:
 *              - Consumes email jobs from queue
 *              - Sends emails via emailService
 *              - Handles retries and failures
 *              - Logs all activity
 *              - Can run in separate process
 *
 * Architecture:
 * - Can run in main process or separate worker process
 * - Processes one job at a time by default (concurrency configurable)
 * - Automatically retries failed jobs with exponential backoff
 * - Persists state in Redis for reliability
 *
 * Usage (in server.js startup):
 *   const queueWorker = require('./services/queueWorker');
 *   await queueWorker.initialize();
 *   queueWorker.start();
 *
 * Scaling:
 * - Run multiple workers for higher throughput
 * - Each worker processes jobs concurrently
 * - Jobs distributed via Redis (no race conditions)
 * - Horizontal scaling: Add more worker processes
 *
 * Monitoring:
 * - Logs all events with full context
 * - Tracks processing time and success/failure
 * - Exports metrics for monitoring/alerting
 * - Integrates with application logging
 */

const queueService = require('./queueService');
const emailService = require('./emailService');
const logger = require('./loggingService');
const emailConfig = require('../constants/emailConfig');

class QueueWorker {
  /**
   * Singleton pattern - one worker per application
   */
  static instance = null;

  /**
   * Constructor for QueueWorker
   * Private - use getInstance() or initialize() instead
   */
  constructor() {
    this.isInitialized = false;
    this.isProcessing = false;
    this.metrics = {
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      totalProcessingTimeMs: 0,
      averageProcessingTimeMs: 0,
    };
  }

  /**
   * Initialize the queue worker
   * Must be called once at application startup
   * Sets up job handlers and error listeners
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      logger.info('[QueueWorker] Worker already initialized');
      return;
    }

    try {
      logger.info('[QueueWorker] Initializing queue worker');

      /**
       * Ensure queue service is initialized
       * Queue service manages Redis connection and Bull queue
       */
      await queueService.initialize();

      /**
       * Ensure email service is initialized
       * Email service manages SMTP connection pool
       */
      await emailService.initialize();

      this.isInitialized = true;
      logger.info('[QueueWorker] Queue worker initialized successfully');
    } catch (error) {
      logger.error('[QueueWorker] Failed to initialize', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Start processing jobs from queue
   * Called after initialize()
   * Sets up job processor and starts consuming
   * Can be called multiple times (idempotent)
   *
   * Job Processing Flow:
   * 1. Worker waits for job in queue
   * 2. Job available -> Worker picks it up
   * 3. Worker sends email via emailService
   * 4. Success -> Job marked complete, removed from queue
   * 5. Failure -> Bull handles retry with exponential backoff
   *
   * Concurrency:
   * - Default: 1 job at a time per worker
   * - Configurable: Set in process env or config
   * - Multiple workers: Each processes jobs independently
   */
  start() {
    if (!this.isInitialized) {
      throw new Error('[QueueWorker] Worker not initialized. Call initialize() first.');
    }

    if (this.isProcessing) {
      logger.warn('[QueueWorker] Worker already processing');
      return;
    }

    logger.info('[QueueWorker] Starting job processor');

    /**
     * Get Bull queue instance
     * Queue was created in queueService.initialize()
     */
    const emailQueue = queueService.emailQueue;

    if (!emailQueue) {
      throw new Error('[QueueWorker] Email queue not available');
    }

    /**
     * Define job processor function
     * Called by Bull when job is ready to process
     *
     * Bull automatically:
     * - Picks up job from queue
     * - Calls processor function with job data
     * - Handles job completion/failure
     * - Manages retries and backoff
     *
     * @param {object} job - Bull job object
     *   @param {object} job.data - Job data (email info)
     *   @param {number} job.id - Unique job ID
     *   @param {number} job.attemptsMade - Number of attempts so far
     *   @param {number} job.opts.attempts - Max attempts allowed
     */
    emailQueue.process(async (job) => {
      const startTime = Date.now();
      const { recipientEmail, subject, htmlContent, textContent, metadata } = job.data;

      try {
        logger.info('[QueueWorker] Processing email job', {
          jobId: job.id,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
          recipient: recipientEmail,
          eventId: metadata?.eventId,
        });

        /**
         * Send email via emailService
         * emailService handles:
         * - SMTP connection (pooled)
         * - Email validation
         * - Error handling
         * - Logging
         *
         * Throws error if send fails
         * Bull catches error and retries automatically
         */
        const result = await emailService.sendEmail({
          to: recipientEmail,
          subject: subject,
          html: htmlContent,
          text: textContent,
          metadata: metadata,
        });

        /**
         * Success: Calculate metrics and return
         * Return value is stored in job.returnvalue
         * Job is marked as completed
         * Job removed from queue (based on config)
         */
        const processingTime = Date.now() - startTime;

        logger.info('[QueueWorker] Job completed', {
          jobId: job.id,
          recipient: recipientEmail,
          processingTimeMs: processingTime,
          messageId: result.messageId,
        });

        this.metrics.jobsProcessed++;
        this.metrics.jobsSucceeded++;
        this.metrics.totalProcessingTimeMs += processingTime;
        this.updateAverageProcessingTime();

        // Update notification record in DB if repository provided
        try {
          if (this.emailNotificationRepository && typeof this.emailNotificationRepository.getNotificationByQueueJobId === 'function') {
            const notification = await this.emailNotificationRepository.getNotificationByQueueJobId(job.id);
            if (notification && notification.id) {
              await this.emailNotificationRepository.recordEmailSent(notification.id, result.message || result.messageId || null, result.providerMessageId || null, job.id);
            }
          }
        } catch (dbErr) {
          logger.error('[QueueWorker] Failed to update notification record after success', {
            jobId: job.id,
            error: dbErr.message,
          });
        }

        /**
         * Return result to Bull
         * Indicates job succeeded
         */
        return {
          success: true,
          result: result,
        };
      } catch (error) {
        /**
         * Error: Log and throw to Bull
         * Bull catches error and:
         * 1. Increments attemptsMade counter
         * 2. Checks if attemptsMade < maxAttempts
         * 3. If more retries: Re-queue with backoff delay
         * 4. If no more retries: Move to failed queue
         *
         * Exception is stored in job.failedReason
         */
        const processingTime = Date.now() - startTime;

        logger.error('[QueueWorker] Job failed', {
          jobId: job.id,
          recipient: recipientEmail,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
          processingTimeMs: processingTime,
          error: error.message,
          errorCode: error.code,
          nextRetryAt: job.nextRetryTime ? new Date(job.nextRetryTime) : 'No retry',
        });

        this.metrics.jobsProcessed++;
        this.metrics.jobsFailed++;
        this.metrics.totalProcessingTimeMs += processingTime;
        this.updateAverageProcessingTime();

        /**
         * Re-throw error
         * Bull catches and handles retry logic
         * No need to manually manage retries here
         */
        // Update tracking record as failed (if available)
        try {
          if (this.emailNotificationRepository && typeof this.emailNotificationRepository.getNotificationByQueueJobId === 'function') {
            const notification = await this.emailNotificationRepository.getNotificationByQueueJobId(job.id);
            if (notification && notification.id) {
              await this.emailNotificationRepository.recordEmailFailed(
                notification.id,
                error.message,
                error.code || null,
                error.stack || null,
                emailConfig.QUEUE_CONFIG.jobOptions.backoff?.delay || 5000
              );
            }
          }
        } catch (dbErr) {
          logger.error('[QueueWorker] Failed to record job failure in DB', {
            jobId: job.id,
            error: dbErr.message,
          });
        }

        throw error;
      }
    });

    /**
     * Global error handler for queue
     * Catches errors that occur outside job processor
     * Examples: Connection issues, severe errors
     */
    emailQueue.on('error', (error) => {
      logger.error('[QueueWorker] Queue processor error', {
        error: error.message,
        stack: error.stack,
      });
    });

    this.isProcessing = true;
    logger.info('[QueueWorker] Job processor started and listening for jobs');
  }

  /**
   * Stop processing jobs
   * Gracefully shuts down job processor
   * Doesn't close queue - just stops consuming
   *
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      const emailQueue = queueService.emailQueue;

      if (emailQueue) {
        /**
         * Pause queue processing
         * Stops accepting new jobs
         * Doesn't interrupt running jobs
         */
        await emailQueue.pause();
        logger.info('[QueueWorker] Job processor paused');
      }

      this.isProcessing = false;
    } catch (error) {
      logger.error('[QueueWorker] Error stopping processor', {
        error: error.message,
      });
    }
  }

  /**
   * Get worker metrics
   * Used for monitoring and health checks
   *
   * @returns {object} Worker metrics
   */
  getMetrics() {
    return {
      jobsProcessed: this.metrics.jobsProcessed,
      jobsSucceeded: this.metrics.jobsSucceeded,
      jobsFailed: this.metrics.jobsFailed,
      averageProcessingTimeMs: Math.round(this.metrics.averageProcessingTimeMs),
      successRate:
        this.metrics.jobsProcessed > 0
          ? ((this.metrics.jobsSucceeded / this.metrics.jobsProcessed) * 100).toFixed(2) + '%'
          : 'N/A',
    };
  }

  /**
   * Helper: Update average processing time
   * Used for performance metrics
   * @private
   */
  updateAverageProcessingTime() {
    if (this.metrics.jobsProcessed > 0) {
      this.metrics.averageProcessingTimeMs =
        this.metrics.totalProcessingTimeMs / this.metrics.jobsProcessed;
    }
  }

  /**
   * Set repositories (dependency injection)
   * Allows worker to update notification records in DB
   * @param {object} repositories
   */
  setRepositories(repositories) {
    this.emailNotificationRepository = repositories.emailNotificationRepository || this.emailNotificationRepository;
  }

  /**
   * Get singleton instance
   * Ensures only one worker per application
   *
   * @returns {QueueWorker} Singleton instance
   */
  static getInstance() {
    if (!QueueWorker.instance) {
      QueueWorker.instance = new QueueWorker();
    }
    return QueueWorker.instance;
  }
}

module.exports = QueueWorker.getInstance();
