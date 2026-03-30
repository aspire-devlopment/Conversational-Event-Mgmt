# API Endpoints

This document lists the API endpoints in the project, what each one is for, and the middleware applied to it.

## Overview

The backend exposes three main API groups:

- ` /api/auth` for authentication
- ` /api/chat` for conversational event creation
- ` /api/events` for legacy event CRUD
- ` /api/v1` for versioned CRUD endpoints

## Health Check

| Method | Endpoint | Purpose | Middleware |
|---|---|---|---|
| GET | `/api/health` | Confirms the backend is running | None |

## Authentication API

Base path: `/api/auth`

| Method | Endpoint | Purpose | Middleware |
|---|---|---|---|
| POST | `/api/auth/login` | Logs a user in and returns a JWT | `validateLogin` |
| POST | `/api/auth/register` | Creates a new user account | `validateRegister` |
| POST | `/api/auth/logout` | Logs the current user out | `verifyJWTToken` |
| GET | `/api/auth/me` | Returns the authenticated user profile | `verifyJWTToken` |

## Chat API

Base path: `/api/chat`

| Method | Endpoint | Purpose | Middleware |
|---|---|---|---|
| POST | `/api/chat/session` | Creates a new chat session for event creation or editing | `verifyJWTToken` |
| GET | `/api/chat/session/:sessionId` | Loads a saved chat session | `verifyJWTToken` |
| POST | `/api/chat/message` | Sends a chat message and updates the event draft | `verifyJWTToken` |
| DELETE | `/api/chat/session/:sessionId` | Deletes a chat session and clears the draft | `verifyJWTToken` |

## Legacy Event API

Base path: `/api/events`

| Method | Endpoint | Purpose | Middleware |
|---|---|---|---|
| GET | `/api/events` | Lists events visible to the current user | `verifyJWTToken` |
| POST | `/api/events` | Creates a new event | `verifyJWTToken`, `createEventIdempotencyMiddleware`, `validateEventPayload`, `createValidateEventDuplicate` |
| GET | `/api/events/:id` | Returns a single event by id | `verifyJWTToken`, `validateEventIdParam` |
| PUT | `/api/events/:id` | Updates an existing event | `verifyJWTToken`, `validateEventIdParam` |
| DELETE | `/api/events/:id` | Deletes an event | `verifyJWTToken`, `validateEventIdParam` |

## Versioned API v1

Base path: `/api/v1`

### Users

| Method | Endpoint | Purpose | Middleware |
|---|---|---|---|
| GET | `/api/v1/users` | Lists users | None |
| GET | `/api/v1/users/:id` | Returns a user by id | `requireIdParam` |
| POST | `/api/v1/users` | Creates a user | `validateUserPayload` |
| PUT | `/api/v1/users/:id` | Updates a user | `requireIdParam` |
| DELETE | `/api/v1/users/:id` | Deletes a user | `requireIdParam` |

### Roles

| Method | Endpoint | Purpose | Middleware |
|---|---|---|---|
| GET | `/api/v1/roles` | Lists roles | None |
| GET | `/api/v1/roles/:id` | Returns a role by id | `requireIdParam` |
| POST | `/api/v1/roles` | Creates a role | `validateRolePayload` |
| PUT | `/api/v1/roles/:id` | Updates a role | `requireIdParam`, `validateRolePayload` |
| DELETE | `/api/v1/roles/:id` | Deletes a role | `requireIdParam` |

### Events

| Method | Endpoint | Purpose | Middleware |
|---|---|---|---|
| GET | `/api/v1/events` | Lists v1 events | None |
| GET | `/api/v1/events/:id` | Returns a v1 event by id | `requireIdParam` |
| POST | `/api/v1/events` | Creates a v1 event | `validateEventPayloadV1` |
| PUT | `/api/v1/events/:id` | Updates a v1 event | `requireIdParam` |
| DELETE | `/api/v1/events/:id` | Deletes a v1 event | `requireIdParam` |

### Chat Sessions

| Method | Endpoint | Purpose | Middleware |
|---|---|---|---|
| GET | `/api/v1/chat-sessions` | Lists chat sessions | None |
| GET | `/api/v1/chat-sessions/:id` | Returns a chat session by id | `requireIdParam` |
| POST | `/api/v1/chat-sessions` | Creates a chat session record | `validateChatSessionPayload` |
| PUT | `/api/v1/chat-sessions/:id` | Updates a chat session | `requireIdParam` |
| DELETE | `/api/v1/chat-sessions/:id` | Deletes a chat session | `requireIdParam` |

### Event Roles

| Method | Endpoint | Purpose | Middleware |
|---|---|---|---|
| GET | `/api/v1/event-roles` | Lists event-role mappings | None |
| POST | `/api/v1/event-roles/assign` | Assigns a role to an event | `validateEventRolePayload` |
| POST | `/api/v1/event-roles/unassign` | Removes a role from an event | `validateEventRolePayload` |

## Shared Middleware Summary

| Middleware | Purpose |
|---|---|
| `verifyJWTToken` | Verifies the JWT and attaches the authenticated user to `req.user` |
| `createEventIdempotencyMiddleware` | Prevents duplicate event creation requests from being processed twice |
| `validateLogin` | Validates login payloads |
| `validateRegister` | Validates registration payloads |
| `validateEventPayload` | Validates the legacy event payload shape |
| `validateEventIdParam` | Ensures route ids are positive integers |
| `createValidateEventDuplicate` | Rejects duplicate legacy event creation requests |
| `requireIdParam` | Validates v1 route ids |
| `validateUserPayload` | Validates v1 user payloads |
| `validateRolePayload` | Validates v1 role payloads |
| `validateEventPayloadV1` | Validates v1 event payloads |
| `validateChatSessionPayload` | Validates v1 chat session payloads |
| `validateEventRolePayload` | Validates event-role assignment payloads |
| `asyncHandler` | Wraps async handlers and forwards errors to the global error handler |
| `securityMiddleware` | Adds Helmet security headers |
| `httpsRedirect` | Redirects HTTP to HTTPS in production |
| `createRequestLogger` | Logs request and response data |
| `errorHandler` | Standardizes error responses |

## Notes

- The chat and legacy event routes are the ones used by the admin UI.
- The `v1` routes are broader CRUD endpoints used by the repository-style API layer.
- All protected routes require JWT authentication.

