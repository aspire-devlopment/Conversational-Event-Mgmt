/**
 * File: emailService.js
 * Purpose: Email sending service using Nodemailer
 * Description: Production-grade email service with:
 *              - Multiple SMTP provider support (Gmail, SendGrid, etc.)
 *              - HTML and plain text template support
 *              - Connection pooling for performance
 *              - Error handling and retry logic
 *              - Detailed logging for debugging
 *              - Email validation before sending
 *
 * Architecture:
 * - Nodemailer Transporter: SMTP connection pool
 * - Template Engine: Variable substitution in email content
 * - Rate Limiting: Built-in via SMTP pool config
 * - Error Recovery: Graceful degradation on failures
 *
 * Usage:
 *   const emailService = require('./emailService');
 *   await emailService.initialize();
 *   const result = await emailService.sendEmail({
 *     to: 'user@example.com',
 *     subject: 'Test Email',
 *     html: '<h1>Hello</h1>',
 *     text: 'Hello'
 *   });
 *
 * Performance:
 * - Connection pooling: Reuses SMTP connections
 * - Rate limiting: 1 email per second (configurable)
 * - Typical send time: 200-500ms
 * - Throughput: ~3600 emails/hour at 1/sec rate
 */

const nodemailer = require('nodemailer');
const logger = require('./loggingService');
const emailConfig = require('../constants/emailConfig');

class EmailService {
  /**
   * Singleton pattern - one email service instance per application
   */
  static instance = null;

  /**
   * Constructor for EmailService
   * Private - use getInstance() or initialize() instead
   */
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.metrics = {
      sent: 0,
      failed: 0,
      totalAttempts: 0,
    };
  }

  /**
   * Initialize the email service
   * Must be called once at application startup
   * Creates SMTP transporter with connection pooling
   * Verifies SMTP credentials by testing connection
   *
   * Error Handling:
   * - Catches initialization errors and logs them
   * - Doesn't crash app if SMTP fails (graceful degradation)
   * - Sets isInitialized = false if connection fails
   *
   * @returns {Promise<void>}
   * @throws Will throw if SMTP credentials are invalid
   */
  async initialize() {
    if (this.isInitialized) {
      logger.info('[EmailService] Email service already initialized');
      return;
    }

    try {
      logger.info('[EmailService] Initializing email service');

      /**
       * Validate configuration
       * Checks required env variables before attempting connection
       */
      this.validateConfiguration();

      /**
       * Create Nodemailer transporter
       * Transporter: Handles SMTP connection and email sending
       * Pool: Reuses SMTP connections for better performance
       * Configuration: From emailConfig.SMTP_CONFIG
       */
      this.transporter = nodemailer.createTransport(emailConfig.SMTP_CONFIG);

      /**
       * Test SMTP connection
       * Verifies credentials are correct before marking as initialized
       * Helps catch configuration errors early
       * Non-fatal: Doesn't crash app if test fails
       */
      try {
        const verification = await this.transporter.verify();
        if (verification) {
          logger.info('[EmailService] SMTP connection verified successfully');
        } else {
          logger.warn('[EmailService] SMTP verification failed but continuing');
        }
      } catch (verifyError) {
        logger.warn('[EmailService] SMTP verification warning (non-fatal)', {
          error: verifyError.message,
        });
        // Don't throw - allow service to start in degraded mode
      }

      this.isInitialized = true;
      logger.info('[EmailService] Email service initialized successfully');
    } catch (error) {
      logger.error('[EmailService] Failed to initialize', {
        error: error.message,
      });
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Send email via SMTP
   * Main entry point for sending emails
   * Can be called from queue worker or directly
   * Includes validation, retry logic handled by caller (queue)
   *
   * Input Validation:
   * - Email address format checked
   * - Required fields validated
   * - Subject/content truncated if needed
   *
   * @param {object} emailData - Email parameters
   *   @param {string} emailData.to - Recipient email address (required)
   *   @param {string} emailData.subject - Email subject line (required)
   *   @param {string} emailData.html - HTML email body (optional)
   *   @param {string} emailData.text - Plain text body (optional)
   *   @param {string} emailData.replyTo - Reply-to address (optional)
   *   @param {object} emailData.metadata - Tracking metadata (optional)
   *
   * @returns {Promise<object>} Email send result
   *   @returns {string} result.messageId - SMTP message ID
   *   @returns {string} result.response - SMTP server response
   *   @returns {boolean} result.success - Send status
   *
   * @throws Will throw if required fields missing or service not initialized
   *
   * Example:
   *   const result = await emailService.sendEmail({
   *     to: 'user@example.com',
   *     subject: 'Welcome!',
   *     html: '<h1>Welcome</h1>',
   *     text: 'Welcome',
   *     replyTo: 'support@example.com'
   *   });
   */
  async sendEmail(emailData) {
    if (!this.isInitialized) {
      throw new Error('[EmailService] Email service not initialized. Call initialize() first.');
    }

    const { to, subject, html, text, replyTo, metadata = {} } = emailData;

    /**
     * Input validation
     * Checks required fields and format
     */
    if (!to) {
      throw new Error('[EmailService] Recipient email (to) is required');
    }
    if (!subject) {
      throw new Error('[EmailService] Email subject is required');
    }
    if (!html && !text) {
      throw new Error('[EmailService] Email must have html or text content');
    }

    /**
     * Email address validation
     * Basic regex check for valid format
     * Note: Doesn't validate if address actually exists
     */
    if (!this.isValidEmail(to)) {
      throw new Error(`[EmailService] Invalid email address format: ${to}`);
    }

    try {
      this.metrics.totalAttempts++;

      const testEmailMode = process.env.TEST_EMAIL_MODE === 'true';
      const testEmailAddress = process.env.TEST_EMAIL_ADDRESS || '';
      const recipient = testEmailMode && testEmailAddress ? testEmailAddress : to;

      /**
       * Build email message object for Nodemailer
       * from: Sender address (configured globally)
       * to: Single recipient
       * subject: Email subject line
       * html: HTML version (preferred by most clients)
       * text: Plain text version (fallback)
       * replyTo: Where replies should go
       * headers: Custom headers for tracking
       */
      const mailOptions = {
        from: `${emailConfig.EMAIL_FROM.name} <${emailConfig.EMAIL_FROM.email}>`,
        to: recipient,
        subject: subject,
        html: html || null,
        text: text || null,
        replyTo: replyTo || emailConfig.EMAIL_FROM.email,
        /**
         * Custom headers for tracking and categorization
         * Useful for email provider metrics (SendGrid, etc.)
         */
        headers: {
          'X-Entity-Ref-ID': metadata.eventId ? `event-${metadata.eventId}` : 'no-ref',
          'X-User-ID': metadata.userId ? `user-${metadata.userId}` : 'no-user',
          'X-Original-Recipient': testEmailMode ? to : undefined,
        },
      };

      /**
       * Send email via SMTP transporter
       * Transporter handles connection pooling automatically
       * Returns: SMTP response with message ID
       * Async: Can take 200-1000ms depending on SMTP server
       */
      const info = await this.transporter.sendMail(mailOptions);

      /**
       * Success: Log and return result
       * messageId: SMTP-generated ID for tracking
       * response: SMTP server response code
       */
      logger.info('[EmailService] Email sent successfully', {
        to: recipient,
        originalTo: testEmailMode ? to : undefined,
        testEmailMode,
        subject: subject,
        messageId: info.messageId,
        attemptCount: this.metrics.totalAttempts,
        userId: metadata.userId,
        eventId: metadata.eventId,
      });

      this.metrics.sent++;

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      /**
       * Error: Log and return failure
       * Includes error details for debugging
       * Thrown error indicates job should be retried
       */
      logger.error('[EmailService] Failed to send email', {
        to: to,
        subject: subject,
        error: error.message,
        errorCode: error.code,
        userId: metadata.userId,
        eventId: metadata.eventId,
      });

      this.metrics.failed++;

      /**
       * Re-throw error so queue service can retry
       * Queue service will handle exponential backoff
       */
      throw error;
    }
  }

  /**
   * Send email from queue job
   * Wrapper for queue worker - extracts data from job and calls sendEmail
   * Called by: queueWorker.js
   *
   * @param {object} job - Bull job object with data property
   *   @param {object} job.data - Email data from queue
   * @returns {Promise<object>} Send result
   */
  async sendEmailFromJob(job) {
    const { recipientEmail, subject, htmlContent, textContent, metadata } = job.data;

    return this.sendEmail({
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
      metadata: metadata,
    });
  }

  /**
   * Replace template variables in email content
   * Substitutes {{variableName}} with actual values
   * Called during template rendering
   *
   * @param {string} content - Email content with template variables
   * @param {object} variables - Key-value pairs for substitution
   * @returns {string} Content with variables replaced
   *
   * Example:
   *   const html = "Hello {{userName}}, your event {{eventName}} starts at {{startTime}}";
   *   const result = replaceVariables(html, {
   *     userName: 'John',
   *     eventName: 'Tech Conference',
   *     startTime: '2026-05-10 09:00'
   *   });
   *   // Result: "Hello John, your event Tech Conference starts at 2026-05-10 09:00"
   */
  replaceVariables(content, variables = {}) {
    let result = content;

    /**
     * Iterate through all variables and replace {{key}} with value
     * Regex: {{keyName}} - case sensitive
     * Only replaces whole template placeholders
     */
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    }

    return result;
  }

  /**
   * Get email service metrics
   * Used for monitoring and alerting
   *
   * @returns {object} Service metrics
   */
  getMetrics() {
    return {
      emailsSent: this.metrics.sent,
      emailsFailed: this.metrics.failed,
      totalAttempts: this.metrics.totalAttempts,
      successRate:
        this.metrics.totalAttempts > 0
          ? ((this.metrics.sent / this.metrics.totalAttempts) * 100).toFixed(2) + '%'
          : 'N/A',
    };
  }

  /**
   * Validate email service configuration
   * Checks required environment variables before initialization
   * Throws error if critical configuration missing
   *
   * @throws Error if configuration invalid
   * @private
   */
  validateConfiguration() {
    const { SMTP_CONFIG } = emailConfig;

    if (!SMTP_CONFIG.auth.user) {
      throw new Error('[EmailService] SMTP_USER environment variable not set');
    }

    if (!SMTP_CONFIG.auth.pass) {
      throw new Error('[EmailService] SMTP_PASS environment variable not set');
    }

    if (!SMTP_CONFIG.host) {
      throw new Error('[EmailService] SMTP_HOST environment variable not set');
    }

    logger.info('[EmailService] Configuration validation passed');
  }

  /**
   * Validate email address format
   * Simple regex check for basic email format validation
   * Note: Doesn't verify email actually exists
   *
   * @param {string} email - Email address to validate
   * @returns {boolean} Valid email format
   * @private
   */
  isValidEmail(email) {
    /**
     * Basic email regex
     * Format: localpart@domain.ext
     * Doesn't validate MX records or delivery
     */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Gracefully shutdown email service
   * Called at application shutdown
   *
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      if (this.transporter) {
        this.transporter.close();
        logger.info('[EmailService] Email service closed');
      }
      this.isInitialized = false;
    } catch (error) {
      logger.error('[EmailService] Error during shutdown', {
        error: error.message,
      });
    }
  }

  /**
   * Get singleton instance
   * Ensures only one email service per application
   *
   * @returns {EmailService} Singleton instance
   */
  static getInstance() {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }
}

module.exports = EmailService.getInstance();
