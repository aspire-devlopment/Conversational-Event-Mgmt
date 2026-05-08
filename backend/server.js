/**
 * File: server.js
 * Purpose: Main Express.js server entry point
 * Description: Initializes Express server, configures middleware, registers routes,
 *              handles HTTPS, CORS, security headers, and API request logging.
 *              Listens on port 5000 by default.
 */

require('./config/env');
const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const createEventRoutes = require('./routes/eventRoutes');
const v1Routes = require('./routes/v1Routes');
const createChatRoutes = require('./routes/chatRoutes');
const errorHandler = require('./middleware/errorHandler');
const createRequestLogger = require('./middleware/requestLogger');
const { securityMiddleware, httpsRedirect } = require('./middleware/securityMiddleware');
const HTTP_STATUS = require('./constants/httpStatus');
const MESSAGES = require('./constants/messages');
const { sendError, sendSuccess } = require('./utils/response');
const API_PATHS = require('./constants/apiPaths');
const createRepositories = require('./data/repositoryFactory');
const loggingService = require('./services/loggingService');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const EXTRA_ORIGINS = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = [
  ...new Set([
    FRONTEND_URL,
    ...EXTRA_ORIGINS,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]),
];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const originMatchers = ALLOWED_ORIGINS.map((origin) => {
  if (!origin.includes('*')) {
    return origin;
  }

  return new RegExp(`^${origin.split('*').map(escapeRegex).join('.*')}$`);
});

const isAllowedOrigin = (origin) =>
  originMatchers.some((matcher) =>
    typeof matcher === 'string' ? matcher === origin : matcher.test(origin)
  );
const repositories = createRepositories();
// Inject repository into loggingService singleton
if (loggingService && typeof loggingService.setRepository === 'function') {
  loggingService.setRepository(repositories.logRepository);
}

const logFatalProcessError = (type, error) => {
  const details =
    error instanceof Error
      ? {
          error: error.message,
          errorName: error.name,
          errorStack: error.stack,
        }
      : { error: String(error) };

  try {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      source: 'process',
      message: type,
      ...details,
    }));
  } catch (loggingError) {
    console.error(type, details, loggingError);
  }
};

process.on('unhandledRejection', (reason) => {
  logFatalProcessError('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
  logFatalProcessError('Uncaught exception', error);
});

// Security Middleware: Apply helmet for security headers
app.use(securityMiddleware);

// HTTPS Redirect: Force HTTPS in production
app.use(httpsRedirect);

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients and same-origin requests
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    // Deny without throwing — avoids 500s from CORS middleware
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));

app.use(bodyParser.json({ limit: '3mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '3mb' }));
app.use((req, res, next) => {
  req.loggingService = loggingService;
  next();
});
app.use(createRequestLogger(loggingService));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use(
  '/api/events',
  createEventRoutes(
    repositories.eventRepository,
    repositories.roleRepository,
    repositories.eventRoleRepository,
    repositories.idempotencyRepository
  )
);
app.use(
  '/api/chat',
  createChatRoutes(
    repositories.chatSessionRepository,
    repositories.eventRepository,
    repositories.roleRepository,
    repositories.eventRoleRepository,
    repositories.idempotencyRepository
  )
);
app.use(API_PATHS.V1, v1Routes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  sendSuccess(res, HTTP_STATUS.OK, 'Backend API is running', {
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  sendError(res, HTTP_STATUS.NOT_FOUND, MESSAGES.COMMON.ROUTE_NOT_FOUND, {
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorHandler);

/**
 * Initialize Email and Queue Services
 * Purpose: Setup production-grade email notification system
 * 
 * Initialization Flow:
 * 1. Initialize queue service (Bull + Redis)
 * 2. Initialize email service (Nodemailer SMTP)
 * 3. Start queue worker (processes jobs asynchronously)
 * 4. Set repositories on notification service (dependency injection)
 * 5. Start Express server
 * 
 * Error Handling:
 * - If queue/email fails: Log error but start server anyway
 * - Non-blocking: Server starts even if email service unavailable
 * - Graceful degradation: Email failures logged, don't crash app
 * 
 * Dependencies:
 * - Redis: Required for Bull queue (production reliability)
 * - SMTP: Required for email sending
 * - Environment: EMAIL_NOTIFICATIONS_ENABLED controls feature
 */
const initializeEmailServices = async () => {
  try {
    /**
     * Check if email notifications enabled in configuration
     * Can be disabled via environment variable for testing
     */
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'false') {
      console.log('ℹ️  Email notifications disabled via configuration');
      return;
    }

    console.log('📧 Initializing email notification system...');

    /**
     * Initialize Queue Service
     * - Creates Bull queue instance
     * - Connects to Redis
     * - Sets up job persistence
     * - Enables reliable message delivery
     */
    const queueService = require('./services/queueService');
    await queueService.initialize();
    console.log('✓ Message queue initialized (Bull + Redis)');

    /**
     * Initialize Email Service
     * - Creates Nodemailer transporter
     * - Configures SMTP connection pool
     * - Tests SMTP credentials
     * - Enables email sending
     */
    const emailService = require('./services/emailService');
    await emailService.initialize();
    console.log('✓ Email service initialized (Nodemailer SMTP)');

    /**
     * Initialize Queue Worker
     * - Sets up job processor
     * - Configures retry logic
     * - Starts consuming jobs from queue
     * - Begins background email processing
     */
    const queueWorker = require('./services/queueWorker');
    await queueWorker.initialize();
    // Provide repositories to queue worker so it can update notification records
    if (typeof queueWorker.setRepositories === 'function') {
      queueWorker.setRepositories(repositories);
    } else {
      // add setRepositories method at runtime if missing
      queueWorker.setRepositories = (repos) => {
        queueWorker.emailNotificationRepository = repos.emailNotificationRepository;
      };
      queueWorker.setRepositories(repositories);
    }
    queueWorker.start();
    console.log('✓ Queue worker started (processing emails in background)');

    /**
     * Inject Repositories into Notification Service
     * - Provides database access for user/role lookups
     * - Enables dependency injection pattern
     * - Allows notification service to fetch users
     */
    const notificationService = require('./services/notificationService');
    notificationService.setRepositories(repositories);
    console.log('✓ Notification service configured');

    console.log('✅ Email notification system ready\n');
  } catch (error) {
    /**
     * Non-fatal error handling
     * Logs error but doesn't crash server
     * Server starts without email capability
     */
    console.error('⚠️  Email service initialization failed (non-fatal):', error.message);
    console.log('ℹ️  Server starting without email notifications\n');
    loggingService.error('serverStartup', 'Email service initialization failed', {
      error: error.message,
    });
  }
};

/**
 * Graceful shutdown handler
 * Closes connections and services when process terminates
 * Called on: SIGINT (Ctrl+C), SIGTERM (kill signal)
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} signal received: closing gracefully`);

  try {
    /**
     * Close queue service
     * - Closes Redis connection
     * - Stops accepting new jobs
     */
    const queueService = require('./services/queueService');
    await queueService.shutdown();

    /**
     * Close email service
     * - Closes SMTP connection pool
     * - Flushes pending emails
     */
    const emailService = require('./services/emailService');
    await emailService.shutdown();

    console.log('✓ Services closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message);
    process.exit(1);
  }
};

/**
 * Register shutdown handlers
 * Ensures services are properly closed on process termination
 */
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Server startup with HTTPS support
const startServer = async () => {
  /**
   * Initialize email services before starting server
   * Waits for queue and email service to be ready
   * Continues even if services fail (non-blocking)
   */
  await initializeEmailServices();

  // In production, use HTTPS with provided certificates
  if (process.env.NODE_ENV === 'production' && process.env.HTTPS_CERT_PATH && process.env.HTTPS_KEY_PATH) {
    try {
      const options = {
        cert: fs.readFileSync(process.env.HTTPS_CERT_PATH),
        key: fs.readFileSync(process.env.HTTPS_KEY_PATH),
      };
      https.createServer(options, app).listen(PORT, () => {
        console.log(`\n✓ Secure Backend API running on https://localhost:${PORT}`);
        console.log(`✓ HTTPS: Enabled (certificates loaded)`);
        console.log(`✓ Accepting requests from: ${ALLOWED_ORIGINS.join(', ')}`);
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}\n`);
      });
    } catch (error) {
      console.error('Error loading HTTPS certificates:', error.message);
      console.log('Falling back to HTTP server...');
      app.listen(PORT, () => {
        console.log(`\n✓ Backend API running on http://localhost:${PORT}`);
        console.log(`✓ HTTPS: Disabled (certificate files not found)`);
        console.log(`✓ Accepting requests from: ${ALLOWED_ORIGINS.join(', ')}`);
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}\n`);
      });
    }
  } else {
    // Development: Use standard HTTP
    app.listen(PORT, () => {
      console.log(`\n✓ Backend API running on http://localhost:${PORT}`);
      console.log(`✓ HTTPS: Disabled (development mode)`);
      console.log(`✓ Accepting requests from: ${ALLOWED_ORIGINS.join(', ')}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  }
};

startServer();
