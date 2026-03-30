/**
 * File: server.js
 * Purpose: Main Express.js server entry point
 * Description: Initializes Express server, configures middleware, registers routes,
 *              handles HTTPS, CORS, security headers, and API request logging.
 *              Listens on port 5000 by default.
 */

require('dotenv').config();
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
const LoggingService = require('./services/loggingService');

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
const repositories = createRepositories();
const loggingService = new LoggingService(repositories.logRepository);

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
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
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

// Server startup with HTTPS support
const startServer = () => {
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
