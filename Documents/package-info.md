# Package Information and API Reference

This document explains the API endpoints, the middleware used in the project, and the main packages in the backend and frontend.

## 1. API Endpoints

### Health
- `GET /api/health`
- Purpose: Simple health check to confirm the backend is running.

### Authentication API
Base path: `/api/auth`

- `POST /login`
- Purpose: Log a user in and issue a JWT.
- Middleware: `validateLogin`

- `POST /register`
- Purpose: Register a new user account.
- Middleware: `validateRegister`

- `POST /logout`
- Purpose: Log the current user out.
- Middleware: `verifyJWTToken`

- `GET /me`
- Purpose: Return the authenticated user profile.
- Middleware: `verifyJWTToken`

### Legacy Event API
Base path: `/api/events`

- `GET /`
- Purpose: List events visible to the current user.
- Middleware: `verifyJWTToken`

- `POST /`
- Purpose: Create a new event from the chat or admin flow.
- Middleware: `verifyJWTToken`, `createEventIdempotencyMiddleware`, `validateEventPayload`, `createValidateEventDuplicate`

- `GET /:id`
- Purpose: Get a single event by id.
- Middleware: `verifyJWTToken`, `validateEventIdParam`

- `PUT /:id`
- Purpose: Update an existing event.
- Middleware: `verifyJWTToken`, `validateEventIdParam`

- `DELETE /:id`
- Purpose: Delete an event.
- Middleware: `verifyJWTToken`, `validateEventIdParam`

### Chat API
Base path: `/api/chat`

- `POST /session`
- Purpose: Create a new chat session for event creation or editing.
- Middleware: `verifyJWTToken`

- `GET /session/:sessionId`
- Purpose: Load an existing chat session and continue the conversation.
- Middleware: `verifyJWTToken`

- `POST /message`
- Purpose: Send a chat message and let the assistant update the event draft.
- Middleware: `verifyJWTToken`

- `DELETE /session/:sessionId`
- Purpose: Delete a chat session and clear the draft.
- Middleware: `verifyJWTToken`

### Versioned API v1
Base path: `/api/v1`

- `GET /users`
- Purpose: List users.
- Middleware: none beyond the route handler wrapper.

- `GET /users/:id`
- Purpose: Get a user by id.
- Middleware: `requireIdParam`

- `POST /users`
- Purpose: Create a user.
- Middleware: `validateUserPayload`

- `PUT /users/:id`
- Purpose: Update a user.
- Middleware: `requireIdParam`

- `DELETE /users/:id`
- Purpose: Delete a user.
- Middleware: `requireIdParam`

- `GET /roles`
- Purpose: List roles.

- `GET /roles/:id`
- Purpose: Get a role by id.
- Middleware: `requireIdParam`

- `POST /roles`
- Purpose: Create a role.
- Middleware: `validateRolePayload`

- `PUT /roles/:id`
- Purpose: Update a role.
- Middleware: `requireIdParam`, `validateRolePayload`

- `DELETE /roles/:id`
- Purpose: Delete a role.
- Middleware: `requireIdParam`

- `GET /events`
- Purpose: List v1 events.

- `GET /events/:id`
- Purpose: Get a v1 event by id.
- Middleware: `requireIdParam`

- `POST /events`
- Purpose: Create a v1 event.
- Middleware: `validateEventPayloadV1`

- `PUT /events/:id`
- Purpose: Update a v1 event.
- Middleware: `requireIdParam`

- `DELETE /events/:id`
- Purpose: Delete a v1 event.
- Middleware: `requireIdParam`

- `GET /chat-sessions`
- Purpose: List chat sessions.

- `GET /chat-sessions/:id`
- Purpose: Get a chat session by id.
- Middleware: `requireIdParam`

- `POST /chat-sessions`
- Purpose: Create a chat session row.
- Middleware: `validateChatSessionPayload`

- `PUT /chat-sessions/:id`
- Purpose: Update a chat session.
- Middleware: `requireIdParam`

- `DELETE /chat-sessions/:id`
- Purpose: Delete a chat session.
- Middleware: `requireIdParam`

- `GET /event-roles`
- Purpose: List event-role mappings.

- `POST /event-roles/assign`
- Purpose: Assign a role to an event.
- Middleware: `validateEventRolePayload`

- `POST /event-roles/unassign`
- Purpose: Remove a role from an event.
- Middleware: `validateEventRolePayload`

## 2. Middleware Reference

### Global Middleware in `server.js`

- `securityMiddleware`
- Purpose: Adds Helmet security headers and enables production HTTPS rules.
- File: `backend/middleware/securityMiddleware.js`

- `httpsRedirect`
- Purpose: Redirects HTTP traffic to HTTPS in production.
- File: `backend/middleware/securityMiddleware.js`

- `cors(...)`
- Purpose: Allows requests from approved frontend origins.

- `bodyParser.json()` and `bodyParser.urlencoded()`
- Purpose: Parses JSON and form payloads before route handlers run.

- `createRequestLogger(loggingService)`
- Purpose: Logs request and response metadata for debugging and auditing.
- File: `backend/middleware/requestLogger.js`

- `errorHandler`
- Purpose: Standardizes error responses and logs failures.
- File: `backend/middleware/errorHandler.js`

### Authentication and Authorization Middleware

- `verifyJWTToken`
- Purpose: Reads the JWT from the Authorization header and attaches the authenticated user to `req.user`.
- File: `backend/middleware/authMiddleware.js`

- `optionalVerifyJWTToken`
- Purpose: Adds user info when a token exists, but does not fail if it is missing.
- File: `backend/middleware/authMiddleware.js`

- `authorizeRole(allowedRoles)`
- Purpose: Blocks access when the current user does not have one of the allowed roles.
- File: `backend/middleware/authMiddleware.js`

### Request Validation Middleware

- `validateLogin`
- Purpose: Validates login payloads.
- File: `backend/middleware/requestValidators.js`

- `validateRegister`
- Purpose: Validates registration payloads.
- File: `backend/middleware/requestValidators.js`

- `validateEventPayload`
- Purpose: Validates the legacy event payload shape.
- File: `backend/middleware/requestValidators.js`

- `validateEventIdParam`
- Purpose: Ensures `:id` is a positive integer.
- File: `backend/middleware/requestValidators.js`

- `createValidateEventDuplicate(eventRepository)`
- Purpose: Prevents duplicate event creation when the same event already exists.
- File: `backend/middleware/requestValidators.js`

### v1 Validation Middleware

- `requireIdParam`
- Purpose: Validates v1 route id parameters.
- File: `backend/middleware/v1Validators.js`

- `validateUserPayload`
- Purpose: Validates v1 user payloads.
- File: `backend/middleware/v1Validators.js`

- `validateRolePayload`
- Purpose: Validates v1 role payloads.
- File: `backend/middleware/v1Validators.js`

- `validateEventPayloadV1`
- Purpose: Validates v1 event payloads.
- File: `backend/middleware/v1Validators.js`

- `validateChatSessionPayload`
- Purpose: Validates that chat session data is a JSON object.
- File: `backend/middleware/v1Validators.js`

- `validateEventRolePayload`
- Purpose: Validates event-role assignment payloads.
- File: `backend/middleware/v1Validators.js`

### Idempotency Middleware

- `createEventIdempotencyMiddleware(idempotencyRepository)`
- Purpose: Prevents duplicate event creation requests from being processed more than once.
- File: `backend/middleware/idempotencyMiddleware.js`

### Async Wrapper

- `asyncHandler`
- Purpose: Wraps async route handlers so errors are forwarded to the global error handler.
- File: `backend/middleware/asyncHandler.js`

## 3. Package Information

### Backend Packages

- `express`
- Purpose: HTTP server and route handling.

- `body-parser`
- Purpose: Parses request bodies for JSON and form submissions.

- `cors`
- Purpose: Allows the frontend to call the API from approved origins.

- `dotenv`
- Purpose: Loads environment variables from `.env`.

- `helmet`
- Purpose: Adds secure HTTP headers.

- `jsonwebtoken`
- Purpose: Signs and verifies JWT access tokens.

- `pg`
- Purpose: Connects to PostgreSQL.

- `bcrypt`
- Purpose: Hashes passwords securely.

- `openai`
- Purpose: LLM client used by the AI orchestration layer.

- `@google/genai`
- Purpose: Alternate AI client dependency included in the backend setup.

- `uuid`
- Purpose: Generates unique ids for records and session data.

- `nodemon`
- Purpose: Automatically restarts the backend during development.

### Frontend Packages

- `react`
- Purpose: UI framework for the admin dashboard.

- `react-dom`
- Purpose: Renders the React app into the browser DOM.

- `react-router-dom`
- Purpose: Handles page navigation inside the SPA.

- `react-scripts`
- Purpose: Provides the Create React App build and dev tooling.

- `lucide-react`
- Purpose: Icon library used throughout the dashboard.

- `@testing-library/react`
- Purpose: React component testing.

- `@testing-library/jest-dom`
- Purpose: Extra DOM matchers for tests.

- `@testing-library/user-event`
- Purpose: Simulates user interactions in tests.

- `@testing-library/dom`
- Purpose: Core DOM testing utilities.

- `web-vitals`
- Purpose: Measures frontend performance signals.

- `tailwindcss`
- Purpose: Utility-first styling system.

- `postcss`
- Purpose: Processes CSS for the frontend build.

- `autoprefixer`
- Purpose: Adds browser CSS prefixes automatically.

## 4. Useful Scripts

### Backend

- `npm start`
- Purpose: Start the backend server.

- `npm run dev`
- Purpose: Start the backend with nodemon.

- `npm run seed:test-admin`
- Purpose: Create the test admin user in an existing database.

### Frontend

- `npm start`
- Purpose: Start the React development server.

- `npm run build`
- Purpose: Build the frontend for production.

- `npm test`
- Purpose: Run the React test runner.

## 5. Summary

The project uses a small set of focused middleware layers to handle security, authentication, validation, idempotency, logging, and error handling. The API is split into three main groups:
- legacy event/auth endpoints
- chat-first event creation endpoints
- versioned v1 CRUD endpoints

This keeps the code organized while supporting both the chat workflow and the underlying data APIs.
