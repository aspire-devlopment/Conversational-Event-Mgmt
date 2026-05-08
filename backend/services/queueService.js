/**
 * File: queueService.js
 * Purpose: Email message queue management using Bull + Redis
 * Description: Production-grade message queue for reliable, scalable email delivery
 *
 * Architecture:
 * - Bull Queue: Manages job persistence and retry logic
 * - Redis Backend: Durable storage for pending jobs (survives restarts)
 * - Worker Pattern: Separate process can consume jobs
 * - Error Handling: Automatic retries with exponential backoff
 * - Monitoring: Built-in metrics and job tracking
 *
 * Benefits:
 * - Decouples event creation from email sending (non-blocking)
 * - Handles high volume of emails without overwhelming SMTP
 * - Survives application crashes (jobs persisted in Redis)
 * - Automatic retry with exponential backoff for failed emails
 * - Built-in job priorities, delays, and rate limiting
 * - Monitorable queue metrics (pending, active, completed, failed)
 *
 * Usage:
 *   const queueService = require('./queueService');
 *   await queueService.initialize();
 *   await queueService.addEmailJob(recipientEmail, subject, html);
 *   const metrics = queueService.getMetrics();
 */

const Queue = require('bull');
const Redis = require('ioredis');
const logger = require('./loggingService');
const emailConfig = require('../constants/emailConfig');

class QueueService {
  /**
   * Singleton pattern - one queue instance per application
   */
  static instance = null;

  /**
   * Constructor for QueueService
   * Private - use getInstance() or initialize() instead
   */
  constructor() {
    this.emailQueue = null;
    this.redis = null;
    this.isInitialized = false;
    this.jobMetrics = {
      totalAdded: 0,
      totalCompleted: 0,
      totalFailed: 0,
      averageSendTime: 0,
    };
  }

  /**
   * Initialize the queue service
   * Must be called once at application startup
   * Creates Redis connection and Bull queue instance
   *
   * Error Handling:
   * - Catches connection errors and logs them
   * - Doesn't crash app if Redis unavailable (graceful degradation)
   * - Retries connection on failure
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      logger.info('[QueueService] Queue already initialized');
      return;
    }

    try {
      logger.info('[QueueService] Initializing email queue with Bull + Redis');

      /**
       * Create Redis connection with retry strategy
       * Used as underlying storage for Bull queue
       * Separate from queue's connection for flexibility
       */
      this.redis = new Redis(emailConfig.QUEUE_CONFIG.redis);

      /**
       * Redis event listeners for monitoring
       */
      this.redis.on('connect', () => {
        logger.info('[Redis] Connected to Redis server');
      });

      this.redis.on('error', (err) => {
        logger.error('[Redis] Connection error', { error: err.message });
      });

      this.redis.on('close', () => {
        logger.warn('[Redis] Connection closed');
      });

      /**
       * Create Bull queue instance
       * Name: 'email-notifications' (visible in Redis and Bull UI)
       * Configuration: Uses Redis for persistence
       * Default Options: Applied to all jobs in this queue
       */
      // Create Bull queue and supply explicit ioredis clients to avoid
      // Bull falling back to localhost when complex redis options (tls/url)
      // are used. Using `createClient` ensures all internal connections
      // (client, subscriber, bclient) use the same ioredis options.
      this.emailQueue = new Queue(emailConfig.QUEUE_CONFIG.queueName, {
        createClient: (type) => {
          // For debugging, log which client Bull is creating
          logger.debug('[QueueService] createClient called', { type });
          return new Redis(emailConfig.QUEUE_CONFIG.redis);
        },
      });

      /**
       * Queue event listeners for monitoring and debugging
       */

      /**
       * Event: Job Added
       * Fired when new job added to queue
       * Useful for tracking incoming work
       */
      this.emailQueue.on('waiting', (job) => {
        logger.debug('[EmailQueue] Job waiting', { jobId: job.id });
      });

      /**
       * Event: Job Active
       * Fired when job starts processing
       * Indicates worker picked up the job
       */
      this.emailQueue.on('active', (job) => {
        logger.debug('[EmailQueue] Job active', { jobId: job.id });
      });

      /**
       * Event: Job Completed
       * Fired when job successfully completed
       * Metrics: Track completion for monitoring
       */
      this.emailQueue.on('completed', (job, result) => {
        logger.info('[EmailQueue] Job completed', {
          jobId: job.id,
          attempts: job.attemptsMade,
          sendTime: job.finishedOn - job.processedOn,
        });
        this.jobMetrics.totalCompleted++;
        this.updateAverageSendTime(job);
      });

      /**
       * Event: Job Failed
       * Fired when job fails and no more retries
       * Important: Job moved to failed set, not deleted
       * Can be inspected later for debugging
       */
      this.emailQueue.on('failed', (job, error) => {
        logger.error('[EmailQueue] Job failed', {
          jobId: job.id,
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          error: error.message,
          recipient: job.data.recipientEmail,
        });
        this.jobMetrics.totalFailed++;
      });

      /**
       * Event: Queue Error
       * Fired for queue-level errors (Redis, connection, etc.)
       * Critical: These are infrastructure issues, not job issues
       */
      this.emailQueue.on('error', (error) => {
        logger.error('[EmailQueue] Queue error', { error: error.message });
      });

      this.isInitialized = true;
      logger.info('[QueueService] Email queue initialized successfully');
    } catch (error) {
      logger.error('[QueueService] Failed to initialize', { error: error.message });
      throw error;
    }
  }

  /**
   * Add email job to the queue
   * Non-blocking: Returns immediately, email sent asynchronously
   * Guarantees: Job persisted in Redis, survives app crash
   *
   * Retry Strategy:
   * - Attempt 1: Immediate
   * - Attempt 2: After 5 seconds (exponential backoff)
   * - Attempt 3: After 25 seconds
   * - After 3 failures: Moved to failed queue
   *
   * @param {string} recipientEmail - Email address to send to
   * @param {string} subject - Email subject line
   * @param {string} htmlContent - HTML email body
   * @param {string} textContent - Plain text fallback
   * @param {object} metadata - Additional data for tracking (optional)
   * @returns {Promise<object>} Job object with job ID
   *
   * @throws Will throw if Redis/queue not initialized
   *
   * Example:
   *   const job = await queueService.addEmailJob(
   *     'user@example.com',
   *     'Event Created',
   *     '<html>...</html>',
   *     'Plain text version'
   *   );
   *   console.log('Email queued:', job.id); // Job ID for tracking
   */
  async addEmailJob(recipientEmail, subject, htmlContent, textContent, metadata = {}) {
    if (!this.isInitialized || !this.emailQueue) {
      throw new Error('[QueueService] Queue not initialized. Call initialize() first.');
    }

    try {
      /**
       * Job data structure
       * Contains all information needed by worker to send email
       * Immutable after job creation - data doesn't change
       */
      const jobData = {
        recipientEmail,
        subject,
        htmlContent,
        textContent,
        metadata: {
          eventId: metadata.eventId || null,
          userId: metadata.userId || null,
          userRole: metadata.userRole || null,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      };

      /**
       * Add job to queue with default options from config
       * Options define retry, timeout, and removal behavior
       * jobOptions come from emailConfig.QUEUE_CONFIG.jobOptions
       */
      const job = await this.emailQueue.add(jobData, emailConfig.QUEUE_CONFIG.jobOptions);

      logger.info('[QueueService] Email job queued', {
        jobId: job.id,
        recipient: recipientEmail,
        state: job._state,
      });

      this.jobMetrics.totalAdded++;

      return job;
    } catch (error) {
      logger.error('[QueueService] Failed to add email job', {
        recipient: recipientEmail,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get queue metrics and health status
   * Used for monitoring, alerting, and debugging
   * Returns real-time queue state
   *
   * @returns {Promise<object>} Queue metrics
   *   - pending: Jobs waiting to be processed
   *   - active: Jobs currently being processed
   *   - completed: Successfully sent emails
   *   - failed: Failed emails (retry exhausted)
   *   - delayed: Jobs waiting for retry window
   *   - totalAdded: Cumulative jobs added (in-memory counter)
   */
  async getMetrics() {
    if (!this.isInitialized || !this.emailQueue) {
      return null;
    }

    try {
      /**
       * Get counts from Bull queue
       * These are persisted in Redis, not in-memory
       * Accurate across application restarts
       */
      const counts = await this.emailQueue.getJobCounts();

      const metrics = {
        queue: {
          pending: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
        },
        memory: {
          totalAdded: this.jobMetrics.totalAdded,
          totalCompleted: this.jobMetrics.totalCompleted,
          totalFailed: this.jobMetrics.totalFailed,
          averageSendTimeMs: Math.round(this.jobMetrics.averageSendTime),
        },
        health: {
          queueHealthy: counts.waiting < emailConfig.MONITORING.queueBacklogThreshold,
          failureRate:
            this.jobMetrics.totalAdded > 0
              ? this.jobMetrics.totalFailed / this.jobMetrics.totalAdded
              : 0,
        },
      };

      return metrics;
    } catch (error) {
      logger.error('[QueueService] Failed to get metrics', { error: error.message });
      return null;
    }
  }

  /**
   * Get failed jobs for inspection/debugging
   * Useful for understanding why emails didn't send
   * Can be retried manually if needed
   *
   * @param {number} limit - Maximum failed jobs to return (default: 100)
   * @returns {Promise<array>} Array of failed job objects
   */
  async getFailedJobs(limit = 100) {
    if (!this.isInitialized || !this.emailQueue) {
      return [];
    }

    try {
      const failedJobs = await this.emailQueue.getFailed(0, limit - 1);
      return failedJobs;
    } catch (error) {
      logger.error('[QueueService] Failed to get failed jobs', { error: error.message });
      return [];
    }
  }

  /**
   * Get pending jobs in queue
   * Useful for monitoring backlog
   *
   * @param {number} limit - Maximum pending jobs to return (default: 100)
   * @returns {Promise<array>} Array of pending job objects
   */
  async getPendingJobs(limit = 100) {
    if (!this.isInitialized || !this.emailQueue) {
      return [];
    }

    try {
      const pendingJobs = await this.emailQueue.getWaiting(0, limit - 1);
      return pendingJobs;
    } catch (error) {
      logger.error('[QueueService] Failed to get pending jobs', { error: error.message });
      return [];
    }
  }

  /**
   * Retry a specific failed job
   * Resets attempt counter and re-queues for processing
   * Useful for manual intervention or external retry logic
   *
   * @param {string} jobId - Job ID to retry
   * @returns {Promise<void>}
   */
  async retryFailedJob(jobId) {
    if (!this.isInitialized || !this.emailQueue) {
      return;
    }

    try {
      const job = await this.emailQueue.getJob(jobId);
      if (!job) {
        logger.warn('[QueueService] Job not found', { jobId });
        return;
      }

      await job.retry();
      logger.info('[QueueService] Job retried', { jobId });
    } catch (error) {
      logger.error('[QueueService] Failed to retry job', {
        jobId,
        error: error.message,
      });
    }
  }

  /**
   * Clear all jobs from queue
   * WARNING: This is destructive and removes all pending/completed jobs
   * Use with caution - only for testing/maintenance
   *
   * @returns {Promise<void>}
   */
  async clearQueue() {
    if (!this.isInitialized || !this.emailQueue) {
      return;
    }

    try {
      await this.emailQueue.clean(0, 'completed');
      await this.emailQueue.clean(0, 'failed');
      await this.emailQueue.empty();
      logger.warn('[QueueService] Queue cleared');
    } catch (error) {
      logger.error('[QueueService] Failed to clear queue', { error: error.message });
    }
  }

  /**
   * Gracefully shutdown the queue service
   * Called at application shutdown
   * Closes Redis connection and Bull queue
   *
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      if (this.emailQueue) {
        await this.emailQueue.close();
        logger.info('[QueueService] Email queue closed');
      }

      if (this.redis) {
        await this.redis.quit();
        logger.info('[QueueService] Redis connection closed');
      }

      this.isInitialized = false;
    } catch (error) {
      logger.error('[QueueService] Error during shutdown', { error: error.message });
    }
  }

  /**
   * Helper: Calculate and update average send time for metrics
   * Used for performance monitoring
   * @private
   */
  updateAverageSendTime(job) {
    const sendTime = job.finishedOn - job.processedOn;
    const totalTime =
      this.jobMetrics.averageSendTime * this.jobMetrics.totalCompleted + sendTime;
    this.jobMetrics.averageSendTime = totalTime / (this.jobMetrics.totalCompleted || 1);
  }

  /**
   * Get singleton instance
   * Ensures only one queue service per application
   *
   * @returns {QueueService} Singleton instance
   */
  static getInstance() {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }
}

module.exports = QueueService.getInstance();
