# AI Conversational Event Management

Chat-first event management for admins using `Node.js`, `React`, and `PostgreSQL`.

Admins can create events entirely through conversation, including:

- event name
- subheading
- description
- banner image URL
- timezone
- status
- start, end, and vanish timestamps
- role assignment

The app stores the created event and shows it in the admin events list.

## Architecture

Frontend:

- React admin dashboard
- chat UI in `frontend/src/components/admin/AdminChatPage.jsx`
- event list UI in `frontend/src/components/admin/AdminEventsPage.jsx`
- JWT-based API access through `frontend/src/services/api.js`

Backend:

- Express API in `backend/server.js`
- conversational orchestration in `backend/controllers/chatController.js`
- LLM integration in `backend/services/openaiService.js`
- chat draft and parsing helpers in `backend/services/chatEventUtils.js`
- PostgreSQL repositories in `backend/repositories/*`

Database:

- events, roles, event_roles, users, and chat_sessions in `backend/schema.sql`

## Conversation Design

The conversational flow is slot-based with AI extraction:

1. Admin starts a session.
2. The assistant asks for missing event metadata one step at a time.
3. The assistant extracts structured values from free text.
4. The draft is persisted after every message.
5. The assistant supports corrections like:
   - `change start time to Tuesday 3 PM`
   - `set roles to Admin and Viewer`
   - `publish it in Europe/London`
6. Once all required fields are present and valid, the assistant confirms and creates the event.

Quick reply chips are shown in the chat for common statuses, timezones, roles, and date phrases so the flow stays inside the chatbox instead of falling back to forms.

## AI Tools Used

This section is intentionally explicit because AI-tool choice and usage are part of the evaluation.

### Tool 1: Codex

Why it was chosen:

- it can inspect and modify the full repository across frontend and backend
- it is effective for architecture reasoning, implementation, review, and technical writing in one workflow
- it helps reduce delivery time without forcing the project into low-quality shortcuts

How it was used:

- Planning:
  - convert the business requirement into implementation tasks
  - identify missing features through gap analysis
  - prioritize the highest-impact missing pieces first
- Development:
  - implement the richer chat event draft model
  - connect chat flow, validation, persistence, and UI rendering
  - refactor data contracts between backend and frontend
- Testing and review:
  - inspect routes, services, repositories, and UI wiring for mismatches
  - run syntax/build verification
  - identify security issues like session ownership and over-trusting client input
- Documentation:
  - write the README, gap closure notes, and AI-usage documentation

Specific use cases in this workflow:

- requirement analysis against the existing codebase
- system design refinement for controller/service/repository separation
- backend implementation of chat session orchestration
- frontend implementation of conversational event creation UI
- code review and requirement re-check after implementation

### Tool 2: OpenRouter LLM API

Why it was chosen:

- it provides flexible model access through a single integration point
- it keeps the application provider-agnostic at the integration layer
- it is suitable for structured conversational extraction using JSON responses

How it was used:

- Product runtime AI:
  - power the chatbot that guides admins through event creation
  - extract event metadata from natural language
  - understand corrections and conversational updates
  - respond in the detected or selected language

Specific product use cases:

- `I want to create an event`
- `call it Q2 Accelerator`
- `publish it in Asia/Katmandu`
- `start next Monday at 10 AM`
- `set roles to Admin and Manager`
- `change start time to Tuesday 3 PM`

### Non-AI Reliability Layer Used Alongside AI

This is not an AI tool, but it is important to explain because it protects quality:

- deterministic validation and parsing in [chatEventUtils.js](/e:/AI-Conversational/backend/services/chatEventUtils.js)

Why this was added:

- AI was used for interpretation, not trusted as the only enforcement layer
- validation of timestamps, roles, and banner URLs stays in normal backend code
- this protects code quality, scalability, and security

## AI Usage Across The Software Development Lifecycle

### Planning

AI usage:

- Codex was used to interpret the requirement, inspect the repo, and identify missing capability areas

Why this helped:

- it reduced discovery time and accelerated scoping of the work

### Development

AI usage:

- Codex was used to implement the missing full-stack changes
- OpenRouter-backed LLM behavior was designed into the actual product flow for conversational extraction

Why this helped:

- it reduced implementation time while preserving separation of concerns

### Testing And Review

AI usage:

- Codex was used to review the implementation against the requirement and run targeted verification

Specific uses:

- syntax checks on backend files
- frontend production build verification
- contract review between backend event responses and frontend rendering
- post-implementation gap re-check

Why this helped:

- it improved confidence without slowing delivery with unnecessary manual repetition

### Documentation

AI usage:

- Codex was used to produce evaluator-focused technical documentation


Why this helped:

- it made the engineering decisions and AI-augmentation strategy explicit, which is a required evaluation criterion

## AI Decision-Making Summary

The core strategy was:

- use Codex to accelerate planning, implementation, review, and documentation
- use OpenRouter-backed LLM responses only where natural-language understanding adds product value
- use deterministic backend logic to keep correctness, scalability, and security under control

Detailed AI decision-making documentation:

- [AI_AUGMENTED_DEVELOPMENT.md](/e:/AI-Conversational/AI_AUGMENTED_DEVELOPMENT.md)

## Localization Approach

Supported languages:

- English
- Spanish
- French

Current behavior:

- the frontend auto-selects a language from the browser locale
- the backend also detects language from the user message
- the assistant replies in that language
- event language is stored with the event row
- user-authored event text stays in the original language

## Validation And Intelligence

The backend validates:

- all required event fields are collected
- `end_time > start_time`
- `vanish_time > end_time`
- banner URL format
- role names against supported roles

Flexible date handling includes phrases like:

- `tomorrow 10 AM`
- `next Monday 2 PM`
- `same day 1 hour later`
- `one week after end`

## Security Considerations

- JWT authentication on chat and event APIs
- session ownership checks on chat session access and mutation
- authenticated user identity comes from JWT, not client-supplied user IDs
- role-aware event access
- server-side validation before persistence
- helmet-based security headers
- CORS allowlist support
- database-backed persistence through parameterized queries
- message length is bounded before LLM processing to reduce abuse and runaway token usage

## Quality And Scalability

- frontend and backend contracts are aligned on the richer event model
- chat orchestration, LLM interaction, and validation are separated into different modules
- only a bounded slice of recent chat history is sent to the LLM
- event draft validation remains deterministic even when extraction is AI-assisted
- event-role assignments are normalized through repositories instead of ad hoc controller logic

## Deployment Approach

Suggested deployment:

- Frontend:
  - Vercel, Netlify, or static hosting from the React production build
- Backend:
  - Render, Railway, Fly.io, Azure App Service, or AWS ECS
- Database:
  - Managed PostgreSQL such as Neon, Supabase, Railway Postgres, or RDS

Environment variables should be configured for:

- database connection
- JWT secret
- OpenRouter or LLM API settings
- frontend origin
- public backend URL for uploaded banners

Free deployment helpers included in the repo:

- [render.yaml](/e:/AI-Conversational/render.yaml)
- [vercel.json](/e:/AI-Conversational/vercel.json)
- [FREE_DEPLOYMENT_GUIDE.md](/e:/AI-Conversational/FREE_DEPLOYMENT_GUIDE.md)

## Trade-offs And Limitations

- banner handling is URL-based in chat right now; file upload is not implemented
- relative date parsing is improved but still rule-assisted rather than full calendar NLP
- chat sessions can fall back to file storage if DB session operations fail
- update/edit flows currently route users back into chat instead of a dedicated edit experience

## Challenges

- balancing LLM flexibility with deterministic validation
- keeping the UI chat-first without introducing fallback forms
- aligning backend event shape with frontend rendering
- supporting multilingual chat while keeping event data structured

## Improvements

- add true banner upload support with object storage
- add a dedicated event edit-in-chat flow seeded from an existing event
- improve analytics and audit logging around event creation
- add automated tests for conversational extraction and API flows
- add stronger language detection and richer timezone/date parsing libraries

## Run Locally

### Easiest Local Windows Run

If you do not want to use Docker, you can run the app locally with one click:

1. Make sure PostgreSQL is running locally
2. Make sure [backend/.env](/e:/AI-Conversational/backend/.env) is configured correctly
3. Double-click [run-local.bat](/e:/AI-Conversational/run-local.bat)
4. Open `http://localhost:3000`

To stop the local app windows, use [stop-local.bat](/e:/AI-Conversational/stop-local.bat)

Detailed local instructions:

- [LOCAL_RUN_GUIDE.md](/e:/AI-Conversational/LOCAL_RUN_GUIDE.md)

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm start
```

Production build:

```bash
cd frontend
npm run build
```

## Run With Docker

The repository now includes a Docker setup so the full app can be started with one command.

What it starts:

- `db`:
  - PostgreSQL with the schema initialized from [schema.sql](/e:/AI-Conversational/backend/schema.sql)
- `backend`:
  - Node.js API on port `5000`
- `frontend`:
  - Nginx-served React build on port `3000`

Prerequisites:

- Docker
- Docker Compose
- an `OPENROUTER_API_KEY`

### Easiest Windows Run

1. Copy `.env.example` to `.env`
2. Put your `OPENROUTER_API_KEY` in `.env`
3. Make sure Docker Desktop is running
4. Double-click [run-app.bat](/e:/AI-Conversational/run-app.bat)
5. Open `http://localhost:3000`

To stop the app, double-click [stop-app.bat](/e:/AI-Conversational/stop-app.bat)

Start everything:

```bash
docker compose up --build
```

Open the app:

- frontend: `http://localhost:3000`
- backend health check: `http://localhost:5000/api/health`

Optional environment variables:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_API_URL`
- `OPENROUTER_TIMEOUT_MS`
- `LLM_TEMPERATURE`

Stop everything:

```bash
docker compose down
```

Stop everything and remove database data:

```bash
docker compose down -v
```

## Verification Notes

Verified during implementation:

- backend syntax checks passed for the updated chat and service files
- frontend production build completed successfully

Build warnings still exist in older unrelated files:

- `frontend/src/components/Footer.jsx`
- `frontend/src/components/RegisterPage.jsx`
- `frontend/src/utils/validation.js`

These warnings do not block the new chat-based event flow.
