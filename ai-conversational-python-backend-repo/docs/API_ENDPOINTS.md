# Python Backend API Endpoints

## Base URL

Local default:

```text
http://localhost:8000
```

Frontend API base:

```text
http://localhost:8000/api
```

## Health

- `GET /health`

## Authentication

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Admin

- `GET /api/admin/users?page=1&pageSize=20`
- `POST /api/admin/users/{user_id}/reset-password`

## Events

- `GET /api/events?page=1&pageSize=20`
- `GET /api/events/{event_id}`
- `POST /api/events`
- `PUT /api/events/{event_id}`
- `DELETE /api/events/{event_id}`

## Chat

- `POST /api/chat/session`
- `GET /api/chat/session/{session_id}`
- `POST /api/chat/message`
- `DELETE /api/chat/session/{session_id}`

## Notes

- Auth uses JWT bearer tokens.
- Admin routes require an authenticated user with the `Admin` role.
- Event and admin listing endpoints support pagination.
- Chat endpoints preserve the response shapes expected by the React frontend.
