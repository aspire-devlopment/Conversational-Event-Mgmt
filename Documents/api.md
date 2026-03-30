# API Documentation

## Overview
This document lists all API endpoints available in the AI Conversational Event Management System. The API is built with Express.js and uses JWT for authentication on protected routes.

**Base URL**: `http://localhost:5000`

---

## Health Check

### GET /api/health
- **Purpose**: Check if the backend API is running
- **Authentication**: Not required
- **Response**: Returns server status and current timestamp
- **Status Code**: 200 OK

---

## Authentication API

### POST /api/auth/login
- **Purpose**: Authenticate user and receive JWT token
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: JWT token and user profile (id, email, firstName, lastName, phone, role)
- **Status Codes**: 
  - 200 OK (successful login)
  - 400 Bad Request (validation error)
  - 401 Unauthorized (invalid credentials)

### POST /api/auth/register
- **Purpose**: Create a new user account
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "123-456-7890",
    "password": "password123",
    "role": "Manager|Sales Rep|Viewer"
  }
  ```
- **Response**: JWT token and newly created user profile
- **Status Codes**:
  - 201 Created (successful registration)
  - 400 Bad Request (validation error)
  - 409 Conflict (email already registered)

### POST /api/auth/logout
- **Purpose**: Invalidate JWT token (client-side logout)
- **Authentication**: Required (Bearer token)
- **Request Header**: `Authorization: Bearer <jwt_token>`
- **Response**: Logout success message
- **Status Codes**:
  - 200 OK (successful logout)
  - 401 Unauthorized (invalid/missing token)

### GET /api/auth/me
- **Purpose**: Get authenticated user profile
- **Authentication**: Required (Bearer token)
- **Request Header**: `Authorization: Bearer <jwt_token>`
- **Response**: Current user's profile (id, email, firstName, lastName, role)
- **Status Codes**:
  - 200 OK (profile retrieved)
  - 401 Unauthorized (invalid/expired token)

---

## Events API (Legacy)

**Base Path**: `/api/events`

### GET /api/events
- **Purpose**: Retrieve all events
- **Authentication**: Not required
- **Response**: Array of events with metadata (id, name, description, timezone, status, etc.)
- **Status Code**: 200 OK

### GET /api/events/:id
- **Purpose**: Retrieve a specific event by ID
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric event ID)
- **Response**: Single event object
- **Status Codes**:
  - 200 OK (event found)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (event not found)

### POST /api/events
- **Purpose**: Create a new event (with duplicate prevention)
- **Authentication**: Required (Bearer token)
- **Request Header**: `Authorization: Bearer <jwt_token>`
- **Request Body**:
  ```json
  {
    "name": "Tech Summit 2026",
    "subheading": "Leading innovations",
    "description": "Annual technology conference",
    "banner_url": "https://example.com/image.jpg",
    "timezone": "America/New_York",
    "status": "Draft|Published",
    "start_time": "2026-05-01T10:00:00Z",
    "end_time": "2026-05-01T18:00:00Z",
    "vanish_time": "2026-06-01T00:00:00Z",
    "language": "en"
  }
  ```
- **Validation**:
  - All required fields must be provided
  - Duplicate events (same name + timezone by same user within 5 minutes) are blocked
  - User ID is extracted from JWT token
- **Response**: Created event object with ID
- **Status Codes**:
  - 201 Created (event created successfully)
  - 400 Bad Request (validation error)
  - 401 Unauthorized (missing/invalid token)
  - 409 Conflict (duplicate event detected within 5-minute window)

### PUT /api/events/:id
- **Purpose**: Update an existing event
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric event ID)
- **Request Body**: Same as POST (partial fields allowed)
- **Response**: Updated event object
- **Status Codes**:
  - 200 OK (event updated)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (event not found)

### DELETE /api/events/:id
- **Purpose**: Delete an event
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric event ID)
- **Response**: Success message
- **Status Codes**:
  - 200 OK (event deleted)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (event not found)

---

## Users API (v1)

**Base Path**: `/api/v1/users`

### GET /api/v1/users
- **Purpose**: Retrieve all users
- **Authentication**: Not required
- **Response**: Array of user objects (id, email, first_name, last_name, contact_number, role, created_at, updated_at)
- **Status Code**: 200 OK

### GET /api/v1/users/:id
- **Purpose**: Retrieve a specific user by ID
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric user ID)
- **Response**: Single user object
- **Status Codes**:
  - 200 OK (user found)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (user not found)

### POST /api/v1/users
- **Purpose**: Create a new user
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "contact_number": "123-456-7890",
    "password_hash": "hashed_password",
    "role": "Manager|Sales Rep|Viewer"
  }
  ```
- **Response**: Created user object with ID
- **Status Codes**:
  - 201 Created (user created)
  - 400 Bad Request (validation error)
  - 409 Conflict (email already exists)

### PUT /api/v1/users/:id
- **Purpose**: Update a user's information
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric user ID)
- **Request Body**: Partial fields allowed
- **Response**: Updated user object
- **Status Codes**:
  - 200 OK (user updated)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (user not found)

### DELETE /api/v1/users/:id
- **Purpose**: Delete a user
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric user ID)
- **Response**: Success message
- **Status Codes**:
  - 200 OK (user deleted)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (user not found)

---

## Roles API (v1)

**Base Path**: `/api/v1/roles`

### GET /api/v1/roles
- **Purpose**: Retrieve all available roles
- **Authentication**: Not required
- **Response**: Array of role objects (id, name, description, created_at, updated_at)
- **Status Code**: 200 OK

### GET /api/v1/roles/:id
- **Purpose**: Retrieve a specific role by ID
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric role ID)
- **Response**: Single role object
- **Status Codes**:
  - 200 OK (role found)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (role not found)

### POST /api/v1/roles
- **Purpose**: Create a new role
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "name": "Administrator",
    "description": "Full system access"
  }
  ```
- **Response**: Created role object with ID
- **Status Codes**:
  - 201 Created (role created)
  - 400 Bad Request (validation error)

### PUT /api/v1/roles/:id
- **Purpose**: Update a role
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric role ID)
- **Request Body**: Partial fields allowed
- **Response**: Updated role object
- **Status Codes**:
  - 200 OK (role updated)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (role not found)

### DELETE /api/v1/roles/:id
- **Purpose**: Delete a role
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric role ID)
- **Response**: Success message
- **Status Codes**:
  - 200 OK (role deleted)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (role not found)

---

## Events API (v1)

**Base Path**: `/api/v1/events`

### GET /api/v1/events
- **Purpose**: Retrieve all events (database-backed)
- **Authentication**: Not required
- **Response**: Array of event objects
- **Status Code**: 200 OK

### GET /api/v1/events/:id
- **Purpose**: Retrieve a specific event by ID
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric event ID)
- **Response**: Single event object
- **Status Codes**:
  - 200 OK (event found)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (event not found)

### POST /api/v1/events
- **Purpose**: Create a new event
- **Authentication**: Not required
- **Request Body**: Same as `/api/events` POST
- **Response**: Created event object
- **Status Codes**:
  - 201 Created (event created)
  - 400 Bad Request (validation error)

### PUT /api/v1/events/:id
- **Purpose**: Update an event
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric event ID)
- **Request Body**: Partial fields allowed
- **Response**: Updated event object
- **Status Codes**:
  - 200 OK (event updated)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (event not found)

### DELETE /api/v1/events/:id
- **Purpose**: Delete an event
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric event ID)
- **Response**: Success message
- **Status Codes**:
  - 200 OK (event deleted)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (event not found)

---

## Chat Sessions API (v1)

**Base Path**: `/api/v1/chat-sessions`

### GET /api/v1/chat-sessions
- **Purpose**: Retrieve all chat sessions
- **Authentication**: Not required
- **Response**: Array of chat session objects
- **Status Code**: 200 OK

### GET /api/v1/chat-sessions/:id
- **Purpose**: Retrieve a specific chat session by ID
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric session ID)
- **Response**: Single chat session object
- **Status Codes**:
  - 200 OK (session found)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (session not found)

### POST /api/v1/chat-sessions
- **Purpose**: Create a new chat session
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "user_id": 1,
    "event_id": 1,
    "topic": "Event Discussion",
    "status": "Active|Archived"
  }
  ```
- **Response**: Created chat session object
- **Status Codes**:
  - 201 Created (session created)
  - 400 Bad Request (validation error)

### PUT /api/v1/chat-sessions/:id
- **Purpose**: Update a chat session
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric session ID)
- **Request Body**: Partial fields allowed
- **Response**: Updated chat session object
- **Status Codes**:
  - 200 OK (session updated)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (session not found)

### DELETE /api/v1/chat-sessions/:id
- **Purpose**: Delete a chat session
- **Authentication**: Not required
- **URL Parameter**: `:id` (numeric session ID)
- **Response**: Success message
- **Status Codes**:
  - 200 OK (session deleted)
  - 400 Bad Request (invalid ID format)
  - 404 Not Found (session not found)

---

## Event Roles API (v1)

**Base Path**: `/api/v1/event-roles`

### GET /api/v1/event-roles
- **Purpose**: Retrieve all event role assignments
- **Authentication**: Not required
- **Response**: Array of event role objects
- **Status Code**: 200 OK

### POST /api/v1/event-roles/assign
- **Purpose**: Assign a user to an event with a specific role
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "event_id": 1,
    "user_id": 1,
    "role_id": 1
  }
  ```
- **Response**: Assignment confirmation object
- **Status Codes**:
  - 201 Created (assignment created)
  - 400 Bad Request (validation error)
  - 409 Conflict (assignment already exists)

### POST /api/v1/event-roles/unassign
- **Purpose**: Remove a user from an event role
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "event_id": 1,
    "user_id": 1,
    "role_id": 1
  }
  ```
- **Response**: Removal confirmation message
- **Status Codes**:
  - 200 OK (assignment removed)
  - 400 Bad Request (validation error)
  - 404 Not Found (assignment not found)

---

## Authentication & Authorization

### JWT Token Structure
The JWT token is included in the `Authorization` header with Bearer scheme:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Manager",
  "iat": 1774552318,
  "exp": 1775157118
}
```

### Token Details
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Expiration**: 7 days
- **Storage**: Header only (no cookies for CORS compatibility)

---

## Error Responses

All errors follow a consistent format:

```json
{
  "status": "error",
  "message": "Error description",
  "data": {
    "details": "Additional error information (if applicable)"
  }
}
```

### Common Status Codes
- **400 Bad Request**: Invalid input, validation failed
- **401 Unauthorized**: Missing or invalid authentication
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource or constraint violation
- **500 Internal Server Error**: Server-side exception

---

## Success Responses

All successful responses follow a consistent format:

```json
{
  "status": "success",
  "message": "Success description",
  "data": {
    "key": "value"
  }
}
```

---

## Features & Validations

### Email Validation
- Must be valid email format
- Case-insensitive (normalized to lowercase)
- Must be unique across all users

### Password Validation
- Minimum 6 characters
- Stored as plain text in current implementation (should be hashed in production)

### Phone Validation
- Supported formats:
  - `123-456-7890`
  - `(123) 456-7890`
  - `+1-123-456-7890`

### Role Validation
- Valid roles: `Manager`, `Sales Rep`, `Viewer`
- Admin registration not allowed through public API
- Required for user registration

### Duplicate Event Prevention
- Events are considered duplicates if:
  - Same `name`
  - Same `timezone`
  - Created by same user (`created_by`)
  - Created within 5 minutes
- Duplicate events return HTTP 409 CONFLICT
- Applies only to `/api/events` endpoint (legacy, JWT-authenticated)

---

## Database Schema Reference

### Users Table
- `id` (PK): Auto-increment
- `first_name`: String
- `last_name`: String
- `email`: String (unique)
- `contact_number`: String
- `password_hash`: String
- `role`: String (foreign key to roles)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Events Table
- `id` (PK): Auto-increment
- `name`: String
- `subheading`: String
- `description`: Text
- `banner_url`: String
- `timezone`: String
- `status`: Enum (Draft, Published, Pending)
- `start_time`: Timestamp
- `end_time`: Timestamp
- `vanish_time`: Timestamp
- `language`: String
- `created_by`: Integer (FK to users)
- `created_at`: Timestamp
- `updated_at`: Timestamp

---

## Environment Variables

Required for API operation:
```
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_secret_key
JWT_EXPIRATION=7d
DATABASE_URL=postgresql://user:password@localhost:5432/EVENT_MANAGEMENT_SYSTEM
NODE_ENV=development
```

---

## Example Requests

### Login Request
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Register Request
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@example.com",
    "firstName":"John",
    "lastName":"Doe",
    "phone":"123-456-7890",
    "password":"password123",
    "role":"Manager"
  }'
```

### Create Event (Authenticated)
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name":"Tech Summit 2026",
    "subheading":"Leading innovations",
    "description":"Annual technology conference",
    "timezone":"America/New_York",
    "status":"Draft",
    "start_time":"2026-05-01T10:00:00Z",
    "end_time":"2026-05-01T18:00:00Z",
    "language":"en"
  }'
```

### Get All Users
```bash
curl -X GET http://localhost:5000/api/v1/users
```

### Get Specific User
```bash
curl -X GET http://localhost:5000/api/v1/users/1
```

---

## Last Updated
March 27, 2026

## Version
API v1.0.0 (with duplicate event prevention)

