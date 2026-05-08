/**
 * File: emailConfig.js
 * Purpose: Email service configuration constants
 * Description: Centralized configuration for email service including:
 *              - SMTP provider settings
 *              - Email templates configuration
 *              - Retry and queue settings
 *              - Email templates paths
 *
 * Usage: Import and use across emailService and notificationService
 */

// Allow specifying a full Redis connection URL (recommended for cloud providers)
// Examples:
//  - rediss://:password@host:6379   (Upstash / TLS)
//  - redis://:password@host:6379
const REDIS_URL = process.env.REDIS_URL || null;

module.exports = {
  /**
   * Email Provider Configuration
   * Supports: 'nodemailer' (SMTP), 'sendgrid' (API), 'aws-ses' (AWS), 'mailgun' (API)
   * Default: 'nodemailer' with configurable SMTP host
   */
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'nodemailer',

  /**
   * SMTP Configuration for Nodemailer
   * Used when EMAIL_PROVIDER is 'nodemailer'
   * Supports: Gmail, SendGrid, custom SMTP servers, etc.
   */
  SMTP_CONFIG: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    pool: {
      maxConnections: 5, // Connection pooling for performance
      maxMessages: 100,
      rateDelta: 1000, // Rate limit: 1 email per second
      rateLimit: 1,
    },
  },

  /**
   * SendGrid API Configuration
   * Used when EMAIL_PROVIDER is 'sendgrid'
   * Alternative to SMTP for better reliability at scale
   */
  SENDGRID_CONFIG: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },

  /**
   * Email From Address & Name
   * Used in all outgoing emails
   * Example: noreply@yourdomain.com
   */
  EMAIL_FROM: {
    email: process.env.EMAIL_FROM_ADDRESS || 'noreply@eventmanagement.com',
    name: process.env.EMAIL_FROM_NAME || 'Event Management System',
  },

  /**
   * Email Queuing Configuration
   * Controls message queue behavior for scalability
   * Uses Bull queue with Redis backend for production reliability
   */
  QUEUE_CONFIG: {
    /**
     * Queue name for email jobs
     * Each job represents one email to be sent
     */
    queueName: 'email-notifications',

    /**
     * Redis connection configuration
     * Bull uses Redis for persistent queue storage
     * Survives application restarts
     */
    // If REDIS_URL is provided, use it (string) which works with ioredis and Bull.
    // Otherwise fall back to host/port object. When using cloud Redis, prefer
    // setting `REDIS_URL=rediss://:PASSWORD@HOST:PORT` in your env.
    redis: REDIS_URL
      || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        // Optional TLS config for cloud Redis providers (set REDIS_TLS=true)
        tls: process.env.REDIS_TLS === 'true' ? { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false' } : undefined,
        maxRetriesPerRequest: null, // Important for Bull compatibility
        enableReadyCheck: false,
      },

    /**
     * Queue job options
     * Defines retry behavior, timeout, and removal policies
     */
    jobOptions: {
      /**
       * Maximum attempts to send an email
       * After 3 failures, email is moved to failed queue
       */
      attempts: 3,

      /**
       * Backoff strategy for retries
       * Exponential: 1st retry after 5s, 2nd after 25s, 3rd after 125s
       * Prevents overwhelming service during outages
       */
      backoff: {
        type: 'exponential',
        delay: 5000, // Initial delay in milliseconds
      },

      /**
       * Job timeout in milliseconds
       * If email takes longer than 30s, mark as failed
       * Prevents jobs from hanging indefinitely
       */
      timeout: 30000,

      /**
       * Remove job after successful completion
       * Reduces Redis memory usage
       * Set to false if you want to retain job history
       */
      removeOnComplete: true,

      /**
       * Keep failed jobs for inspection
       * Failed jobs kept for 24 hours for debugging
       */
      removeOnFail: false,
    },
  },

  /**
   * Email Template Paths
   * HTML and text versions for fallback support
   * Supports template variable substitution
   */
  EMAIL_TEMPLATES: {
    eventCreated: {
      subject: 'New Event Created: {{eventName}}',
      htmlPath: 'templates/emails/eventCreated.html',
      textPath: 'templates/emails/eventCreated.txt',
      category: 'event_notification', // For email provider tracking
    },
    eventUpdated: {
      subject: 'Event Updated: {{eventName}}',
      htmlPath: 'templates/emails/eventUpdated.html',
      textPath: 'templates/emails/eventUpdated.txt',
      category: 'event_notification',
    },
  },

  /**
   * Email Feature Flags
   * Allows enabling/disabling email notifications without code changes
   * Useful for staging/testing or gradual rollout
   */
  FEATURES: {
    /**
     * Enable email notifications globally
     * Set to false to disable all email sending (queue still processes)
     * Default: true in production, false in development
     */
    enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false',

    /**
     * Enable queue-based processing
     * Set to false to send emails synchronously (not recommended for production)
     * Default: true
     */
    useQueue: process.env.EMAIL_USE_QUEUE !== 'false',

    /**
     * Enable email template HTML rendering
     * Set to false to send plain text only
     * Default: true
     */
    useHtmlTemplates: process.env.EMAIL_USE_HTML !== 'false',

    /**
     * Enable retry logic for failed emails
     * Set to false to discard failed emails
     * Default: true
     */
    enableRetries: process.env.EMAIL_ENABLE_RETRIES !== 'false',
  },

  /**
   * Notification Settings
   * Controls who gets notified and how
   */
  NOTIFICATIONS: {
    /**
     * Notify users with these roles when event is created
     * Empty array = all roles, specific array = only these roles
     */
    notifyOnEventCreation: [], // Empty = all roles

    /**
     * Exclude these users from notifications
     * Useful for test/system accounts
     */
    excludeUserIds: [],

    /**
     * Minimum time between notifications to same user
     * Prevents flooding (disabled by default)
     */
    minNotificationIntervalMs: 0,
  },

  /**
   * Logging Configuration
   * Controls verbosity of email operations
   */
  LOGGING: {
    /**
     * Log level for email operations
     * Options: 'error', 'warn', 'info', 'debug'
     */
    level: process.env.EMAIL_LOG_LEVEL || 'info',

    /**
     * Include email addresses in logs (privacy consideration)
     * Set to false in production for security
     */
    logEmailAddresses: process.env.EMAIL_LOG_ADDRESSES !== 'true',

    /**
     * Include full email content in logs
     * Set to false in production for privacy
     */
    logFullContent: false,
  },

  /**
   * Monitoring & Metrics
   * Configuration for tracking email delivery
   */
  MONITORING: {
    /**
     * Enable metrics collection
     * Tracks success/failure rates, sending times, etc.
     */
    enabled: process.env.EMAIL_MONITORING_ENABLED !== 'false',

    /**
     * Alert threshold for failure rate
     * Alert if more than 10% of emails fail
     */
    failureRateThreshold: 0.1,

    /**
     * Alert threshold for queue backlog
     * Alert if more than 1000 emails waiting
     */
    queueBacklogThreshold: 1000,
  },
};
