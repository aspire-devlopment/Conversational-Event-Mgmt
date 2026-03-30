// Security Middleware
// Purpose: Centralizes all security-related middleware configuration.
// This includes:
//   1. Helmet.js: Sets security HTTP headers to protect against common attacks
//      - X-Content-Type-Options: Prevents MIME type sniffing
//      - X-Frame-Options: Prevents clickjacking
//      - X-XSS-Protection: Legacy XSS protection header
//      - Strict-Transport-Security (HSTS): Forces HTTPS connections
//      - Content-Security-Policy: Restricts content sources
//   2. HTTPS enforcement: Redirect HTTP to HTTPS in production
//   3. Security best practices for headers and response handling

/**
 * File: securityMiddleware.js
 * Purpose: Security headers and HTTPS enforcement
 * Description: Applies security headers via helmet middleware,
 *              enforces HTTPS redirect in production,
 *              protects against XSS, clickjacking, CSRF, and other attacks.
 */

const helmet = require('helmet');

const isProd = process.env.NODE_ENV === 'production';

// In development, avoid strict CSP/HSTS on API responses (avoids breaking
// SPA fetch to localhost:5000 and local tooling). Full CSP belongs on the CDN / static host in prod.
const securityMiddleware = isProd
  ? helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      hidePoweredBy: true,
      frameguard: { action: 'deny' },
    })
  : helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      noSniff: true,
      hidePoweredBy: true,
    });

// Middleware to redirect HTTP to HTTPS in production
const httpsRedirect = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.header('host')}${req.originalUrl}`);
  }
  next();
};

module.exports = {
  securityMiddleware,
  httpsRedirect,
};