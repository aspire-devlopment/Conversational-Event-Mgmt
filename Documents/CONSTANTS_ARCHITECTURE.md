# Constants Architecture Documentation

## Overview
This document outlines the proper architecture for managing static values and configuration across the application. All hardcoded values have been extracted into centralized constant files.

## Backend Constants

### 1. **appConfig.js** - Application Configuration Constants
Location: `backend/constants/appConfig.js`

Contains central configuration for the entire application:

#### Roles
```javascript
ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES_REP: 'Sales Rep',
  VIEWER: 'Viewer'
}

VALID_USER_ROLES = ['Manager', 'Sales Rep', 'Viewer']  // For registration
ALL_ROLES = ['Admin', 'Manager', 'Sales Rep', 'Viewer'] // Including admin
DEFAULT_USER_ROLE = 'Viewer' // Default role for new users
```

**Usage:**
```javascript
const { VALID_USER_ROLES, DEFAULT_USER_ROLE } = require('./constants/appConfig');

// Check if role is valid
if (!VALID_USER_ROLES.includes(role)) {
  throw new Error('Invalid role');
}

// Set default role
user.role = DEFAULT_USER_ROLE;
```

#### JWT Configuration
```javascript
JWT_CONFIG = {
  ALGORITHM: 'HS256',
  HEADER_PREFIX: 'Bearer',
  HEADER_NAME: 'Authorization'
}
```

**Usage:**
```javascript
const { JWT_CONFIG } = require('./constants/appConfig');

// In middleware
const authHeader = req.headers[JWT_CONFIG.HEADER_NAME.toLowerCase()];
const tokenParts = authHeader.split(' ');
if (tokenParts[0] !== JWT_CONFIG.HEADER_PREFIX) {
  // Invalid format
}

// In JWT service
jwt.sign(payload, secret, { algorithm: JWT_CONFIG.ALGORITHM });
```

#### Validation Configuration
```javascript
VALIDATION_CONFIG = {
  PASSWORD_MIN_LENGTH: 6,
  FIRST_NAME_MIN_LENGTH: 2,
  LAST_NAME_MIN_LENGTH: 2,
  PHONE_MIN_LENGTH: 10
}
```

**Usage:**
```javascript
const { VALIDATION_CONFIG } = require('./constants/appConfig');

if (password.length < VALIDATION_CONFIG.PASSWORD_MIN_LENGTH) {
  throw new Error('Password too short');
}
```

#### Response Configuration
```javascript
RESPONSE_CONFIG = {
  SUCCESS_STATUS: 'success',
  FAILURE_STATUS: 'failure'
}
```

#### Database Configuration
```javascript
DB_CONFIG = {
  CONNECTION_TIMEOUT_MS: 5000,
  IDLE_TIMEOUT_MS: 30000,
  POOL_MAX_CONNECTIONS: 10
}
```

### 2. **httpStatus.js** - HTTP Status Codes
Location: `backend/constants/httpStatus.js`

```javascript
HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
}
```

**Usage:**
```javascript
const HTTP_STATUS = require('./constants/httpStatus');

return sendError(res, HTTP_STATUS.BAD_REQUEST, message);
```

### 3. **messages.js** - Error & Success Messages
Location: `backend/constants/messages.js`

All messages are organized by category (COMMON, AUTH, EVENTS, JWT):

```javascript
MESSAGES = {
  COMMON: { ... },
  AUTH: {
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_PHONE: 'Please provide a valid phone number...',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long',
    INVALID_ROLE: 'Please select a valid role...',
    ...
  },
  EVENTS: { ... },
  JWT: {
    HEADER_MISSING: 'Authorization header is missing',
    INVALID_HEADER_FORMAT: 'Invalid authorization header format...',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_SIGNATURE: 'Invalid token signature',
    ...
  }
}
```

**Usage:**
```javascript
const MESSAGES = require('./constants/messages');

if (!isEmail(email)) {
  return sendError(res, HTTP_STATUS.BAD_REQUEST, MESSAGES.AUTH.INVALID_EMAIL);
}
```

### 4. **apiPaths.js** - API Endpoint Paths
Location: `backend/constants/apiPaths.js`

```javascript
API_PATHS = {
  V1: '/api/v1',
  USERS: '/users',
  ROLES: '/roles',
  EVENTS: '/events',
  CHAT_SESSIONS: '/chat-sessions',
  EVENT_ROLES: '/event-roles'
}
```

## Files Updated to Use Constants

### Backend Files
1. **middleware/requestValidators.js**
   - ✅ Uses `VALID_USER_ROLES` instead of hardcoded array
   - ✅ Uses `VALIDATION_CONFIG.PASSWORD_MIN_LENGTH`
   - ✅ Uses messages from `MESSAGES` constant

2. **services/authService.js**
   - ✅ Uses `VALID_USER_ROLES` for role validation
   - ✅ Uses `DEFAULT_USER_ROLE` for fallback

3. **middleware/authMiddleware.js**
   - ✅ Uses `JWT_CONFIG.HEADER_NAME` instead of hardcoded 'Authorization'
   - ✅ Uses `JWT_CONFIG.HEADER_PREFIX` instead of hardcoded 'Bearer'
   - ✅ Uses messages from `MESSAGES.JWT`

4. **utils/jwtToken.js**
   - ✅ Uses `JWT_CONFIG.ALGORITHM` instead of hardcoded 'HS256'

### Frontend Files
1. **src/utils/validation.js**
   - ✅ Uses `VALIDATION_MIN_LENGTH` for consistent validation rules
   - ✅All hardcoded numbers (6, 2, 10) moved to constants

## Benefits of This Architecture

### 1. **Single Source of Truth**
- Change password length in one place, used everywhere
- Update error messages centrally
- Modify role definitions once

### 2. **Maintainability**
- Easy to find all usage of a constant
- Clear relationships between components
- Consistent behavior across app

### 3. **Type Safety** (Future)
- Can be converted to TypeScript enums
- IDE autocomplete support
- Prevents typos

### 4. **Configuration Management**
- Easy to switch between environments
- Simple to modify validation rules
- Centralized configuration

### 5. **Testing**
- Mock constants easily
- Test with different configurations
- Verify all paths use constants

## Adding New Constants

### Step 1: Define in appConfig.js
```javascript
const NEW_CONSTANT = {
  VALUE1: 'value1',
  VALUE2: 'value2'
};

module.exports = {
  // ... existing exports
  NEW_CONSTANT,
};
```

### Step 2: Import Where Needed
```javascript
const { NEW_CONSTANT } = require('./constants/appConfig');

// Use it
if (value === NEW_CONSTANT.VALUE1) { ... }
```

### Step 3: Use Consistently
- Never hardcode the value again
- Reference only through constant
- Update tests accordingly

## Migration Checklist

- ✅ Roles extracted to `ROLES` and `VALID_USER_ROLES`
- ✅ Validation lengths extracted to `VALIDATION_CONFIG`
- ✅ JWT algorithm extracted to `JWT_CONFIG`
- ✅ Error messages moved to `MESSAGES`
- ✅ All files updated to use constants
- ✅ HTTP status codes use `HTTP_STATUS`
- ⏳ Password hashing config (for future bcrypt implementation)
- ⏳ Token refresh configuration (for future refresh token implementation)

## Environment Variables vs Constants

### Use Constants For:
- Configuration that should be same across all environments
- Magic numbers (min lengths, timeouts)
- Role definitions
- Message templates

### Use .env (Environment Variables) For:
- Sensitive data (JWT_SECRET, passwords)
- Environment-specific values (PORT, DB_HOST)
- API keys and tokens
- Debug flags

```javascript
// .env file
JWT_SECRET=actual_secret_key_production
JWT_EXPIRATION=7d

// appConfig.js (constants)
JWT_CONFIG = { ALGORITHM: 'HS256' }

// Usage
const token = jwt.sign(payload, process.env.JWT_SECRET, {
  algorithm: JWT_CONFIG.ALGORITHM,
  expiresIn: process.env.JWT_EXPIRATION
});
```

## Best Practices

1. **Name Constants in UPPER_SNAKE_CASE** or camelCase for objects
2. **Group related constants** in logical objects
3. **Use meaningful names** that describe intent, not just values
4. **Document** why a constant has a specific value
5. **Keep constants immutable** - don't reassign
6. **Export from single location** - easier to track usage
7. **Comment complex logic** that relates to constants

## Future Enhancements

1. **Configuration by Environment**
   ```javascript
   // constants/env.js
   const BASE_CONFIG = { ... };
   const ENV_CONFIG = require(`./config.${process.env.NODE_ENV}`);
   module.exports = { ...BASE_CONFIG, ...ENV_CONFIG };
   ```

2. **Type-Safe Constants (TypeScript)**
   ```typescript
   enum Role {
     ADMIN = 'Admin',
     MANAGER = 'Manager',
     SALES_REP = 'Sales Rep',
     VIEWER = 'Viewer'
   }
   ```

3. **Runtime Configuration Validation**
   ```javascript
   validateConfig(ROLES, ['Admin', 'Manager', 'Sales Rep', 'Viewer']);
   ```

---

**Last Updated:** March 27, 2026
**Architecture Version:** 1.0 (Constants Extraction)
