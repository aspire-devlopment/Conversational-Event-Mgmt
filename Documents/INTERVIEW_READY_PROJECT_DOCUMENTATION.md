# Interview-Ready Project Documentation

## 1. Project Overview

### Project Name
AI Conversational Event Management System

### One-Line Summary
This project is an AI-assisted event management platform where an admin can create and update events through natural language conversation instead of filling out a long form.

### What Problem This Project Solves
Traditional event creation forms are rigid, time-consuming, and not very user-friendly when an admin needs to enter many fields such as title, description, timezone, dates, status, banner URL, and role visibility.

This project solves that problem by allowing the admin to talk to the system naturally, for example:

- "Create an event called Sales Kickoff"
- "Set it to Published"
- "Start next Monday at 10 AM"
- "Assign Admin and Manager roles"

The system then converts that free-form conversation into structured event data, validates it, stores it safely in PostgreSQL, and shows the saved event in the dashboard.

### Why This Problem Matters
The main value is usability without losing structure.

Most AI chat systems are flexible but unreliable if used alone. Most form systems are reliable but not flexible. This project combines both:

- AI for natural conversation and field extraction
- backend validation for correctness and safety
- database persistence for reliability and continuity

That balance is the core idea of the system.

## 2. Core Objective

The goal was not just to build a chatbot.

The goal was to build a usable business system where:

- users can create events more naturally
- event data remains structured
- incomplete drafts are not lost
- the backend still controls validation and persistence
- different users only see events relevant to them

So the real solution is "AI-assisted event operations", not "AI for the sake of AI".

## 3. Tech Stack

### Frontend
- React
- JavaScript
- React Router
- Context API for authentication state
- Tailwind/CSS-based UI styling

### Backend
- Node.js
- Express.js
- REST APIs
- JWT authentication
- middleware-based request handling

### Database
- PostgreSQL

### AI Layer
- OpenRouter-compatible LLM API integration
- structured JSON extraction from chat messages

### Supporting Engineering Components
- repository pattern
- service layer
- controller layer
- idempotency protection
- centralized error handling
- security middleware
- request and error logging

### Important Note About Tech Stack
If someone asks "Where did you use Python?", the honest answer is:

This project does not use Python. It is built with JavaScript across the frontend and backend, with PostgreSQL as the database and an LLM API for conversational understanding.

That answer is important because interview explanations should always be truthful.

## 4. High-Level Architecture

The system follows a layered architecture:

1. React frontend handles user interaction.
2. Express routes receive API requests.
3. Controllers manage request/response flow.
4. Services contain business logic and AI orchestration.
5. Repositories handle database access.
6. PostgreSQL stores users, events, roles, chat sessions, idempotency keys, and logs.

### Why This Architecture Was Chosen

I chose this architecture because it keeps responsibilities separated:

- frontend focuses on user experience
- controllers focus on HTTP handling
- services focus on logic and orchestration
- repositories focus on data persistence

This makes the system easier to:

- understand
- test
- debug
- scale
- extend later

If everything had been written inside one large route file, it would work for a demo, but it would become difficult to maintain once the system grows.

## 5. Main Database Design

The main tables are:

- `users`
- `roles`
- `events`
- `event_roles`
- `chat_sessions`
- `idempotency_keys`
- `error_logs`

### Why These Tables Exist

#### `users`
Stores registered users and links them to a role.

Why:
Authentication and role-based access control require a proper user model.

#### `roles`
Stores supported roles such as Admin, Manager, Sales Rep, and Viewer.

Why:
Roles should be normalized in the database instead of hardcoded everywhere.

#### `events`
Stores the final structured event information.

Why:
This is the main business entity of the system.

#### `event_roles`
Stores the many-to-many relationship between events and roles.

Why:
One event can be visible to multiple roles, so a junction table is the correct relational design.

#### `chat_sessions`
Stores the conversation history, current step, and draft event data.

Why:
This is what allows the chat flow to survive refreshes and continue over multiple messages.

#### `idempotency_keys`
Prevents duplicate event creation if the same request is retried.

Why:
In real systems, retries happen because of refreshes, double-clicks, or network instability. Idempotency prevents accidental duplicate records.

#### `error_logs`
Stores error details for debugging and monitoring.

Why:
Production systems need traceability when something fails.

## 6. End-to-End System Flow

## Step 1: User Authentication

The user logs in through the React frontend.

What happens:

1. The frontend sends email and password to `/api/auth/login`.
2. The backend verifies credentials.
3. If valid, the backend generates a JWT token.
4. The frontend stores the token and user information.
5. Protected routes become available.

Why it was built this way:

- JWT is simple and effective for stateless API authentication.
- The backend remains the source of truth for user identity.
- Protected routes help ensure only authenticated users can access admin features.

## Step 2: Chat Session Creation

When the admin opens the chat page, the frontend creates or restores a chat session.

What happens:

1. The frontend checks local storage for an existing session ID.
2. If a session exists, it calls `/api/chat/session/:sessionId`.
3. If no session exists, it calls `POST /api/chat/session`.
4. The backend creates a draft object with empty event fields.
5. The backend stores the session in `chat_sessions`.
6. The assistant sends the first greeting and suggestions.

Why it was built this way:

- Session persistence prevents data loss if the page refreshes.
- Draft state in the database is more reliable than in-memory state.
- This makes the system more realistic than a simple one-request chatbot.

## Step 3: User Sends a Natural Language Message

The admin types something like:
"Create an event called Q2 Accelerator next Monday at 10 AM for Admin and Manager."

What happens:

1. The frontend sends the message to `POST /api/chat/message`.
2. The JWT token identifies the user.
3. The backend loads the session and confirms ownership.
4. The user message is added to conversation history.
5. A limited recent chat history is sent to the LLM.

Why it was built this way:

- session ownership check protects security
- bounded chat history reduces cost and token usage
- storing conversation first ensures the state is preserved even if later steps fail

## Step 4: AI Extraction

The AI service reads the user message and returns structured JSON.

The AI tries to determine:

- intent
- language
- extracted event fields
- changed fields
- next missing step
- assistant reply

Why AI was used here:

Because users speak naturally, not in strict schema format. AI is useful for turning flexible language into structured candidate data.

Why AI was not trusted alone:

AI can misread dates, roles, or statuses. That is why the backend still validates everything after extraction.

This is one of the strongest design choices in the project:

AI handles understanding, but the application handles correctness.

## Step 5: Draft Normalization and Validation

After the AI response comes back, the backend normalizes and validates the draft.

Examples of backend validation:

- required fields must be present
- status must be one of `Draft`, `Published`, `Pending`
- roles must match allowed role names
- `end_time` must be after `start_time`
- `vanish_time` must be after `end_time`
- banner URL must be valid

The system also normalizes:

- language
- roles
- status
- timezone aliases
- natural language dates

Why it was built this way:

- validation belongs in backend logic, not inside the model
- normalization improves consistency before saving
- deterministic rules reduce AI-related unpredictability

## Step 6: Draft Persistence

The updated draft is saved back into `chat_sessions`.

What this means:

- the conversation can continue over multiple turns
- incomplete work is not lost
- the assistant always has the latest known draft

Why it was built this way:

The chat is not a one-shot action. Event creation is iterative. Persisting the draft after every turn supports corrections, step-by-step input, and recovery after interruption.

## Step 7: Confirmation Before Save

Once all required fields are valid, the assistant asks for confirmation.

Examples:

- "Looks good, save it"
- "Confirm"
- "Yes"

Why this confirmation step exists:

- to prevent premature event creation
- to reduce accidental saves
- to make user intent explicit

This is important because AI may think the draft is ready, but the user may still want to change something.

## Step 8: Final Event Creation or Update

If the user confirms and validation passes:

1. the backend checks idempotency
2. the backend checks for equivalent duplicate events
3. the event is inserted or updated in PostgreSQL
4. role mappings are stored in `event_roles`
5. the chat session is removed
6. success is returned to the frontend

Why it was built this way:

- idempotency protects against duplicate writes
- duplicate checks improve data quality
- removing the completed session keeps the active session table clean

## Step 9: Event Listing and Visibility

When users open the event list:

1. the frontend calls `GET /api/events`
2. the backend loads events from the repository
3. the controller filters accessible events based on role and ownership
4. the frontend displays the results

Visibility rules:

- Admin can see all events
- other users can see their own events
- other users can also see events tagged with their role

Why it was built this way:

The event system is not only about creation. It also needs controlled distribution. Role-based visibility makes the feature more practical for real teams.

## 7. Why I Chose AI Chat Instead of a Traditional Form

This is a very likely interview question.

### My answer:

I chose a conversational interface because the problem itself involves collecting many related fields, and natural language reduces friction for admins. Instead of forcing users through a rigid form, the system lets them express intent in a more natural way.

But I did not replace structure with pure AI. I combined:

- conversational input for better usability
- deterministic backend validation for reliability
- database persistence for continuity

That combination gave me the best trade-off between user experience and system correctness.

## 8. Why I Chose PostgreSQL for Chat Sessions and Events

I chose PostgreSQL because:

- event data is relational
- roles and event visibility need joins
- chat drafts need persistence
- transactional updates matter
- PostgreSQL handles structured JSON as well

This was especially useful for `chat_sessions`, because the session data contains structured JSON draft data plus conversation history.

Why not in-memory only:

- data would be lost on restart
- it would not support multiple users reliably
- it would not be suitable for production

## 9. Why I Used Repository + Service + Controller Layers

### Controller
Handles incoming requests and outgoing responses.

### Service
Handles business logic such as AI orchestration, normalization, and validation.

### Repository
Handles database operations.

### Why this separation matters

- each layer has one job
- changes become safer
- debugging is easier
- testing is easier
- future migrations are easier

For example, if I later switch LLM provider or change storage logic, I would not need to rewrite the entire application flow.

## 10. Error Handling Strategy

This is another common interview topic.

### Current Error Handling in the Project

The system handles errors at multiple levels:

- request validation errors
- authentication errors
- authorization errors
- AI/API errors
- database errors
- missing session errors
- duplicate request conflicts
- global Express error middleware

### Examples

#### Invalid JWT
The request is rejected before reaching protected business logic.

Why:
Security should fail early.

#### Session Not Found
The backend returns a not found error, and the frontend can create a fresh session.

Why:
Chat sessions can expire or be cleared. Recovery is better than leaving the UI stuck.

#### AI Returns Bad or Broken JSON
The backend includes defensive parsing and fallback handling.

Why:
LLM output is not always perfect, so production-safe code should not assume ideal output.

#### Duplicate Event Create
The backend checks equivalent identity and idempotency keys.

Why:
Users may retry actions. The system should stay safe under repeated calls.

#### Database Failure
The backend throws through centralized error handling, and logging captures details.

Why:
Silent failures make production support difficult.

## 11. What Happens If Traffic Increases

### Current Behavior
The current design works well for a moderate workload, but heavy growth would create pressure on:

- backend API throughput
- database query volume
- chat session reads/writes
- LLM latency and cost

### How I Would Scale It

#### 1. Make the Backend Horizontally Scalable
Run multiple backend instances behind a load balancer.

Why this works:
The backend is mostly stateless because user identity is in JWT and session data is in PostgreSQL, not local memory.

#### 2. Move Session Storage to a Faster Layer if Needed
Use Redis for hot conversational session state while keeping PostgreSQL for durable persistence.

Why:
Chat sessions are read and updated frequently. Redis would reduce database pressure for very high message volume.

#### 3. Optimize Database Access

- add more targeted indexes
- review slow queries
- paginate large event lists
- use read replicas for heavy read traffic

Why:
As event volume grows, database performance becomes a major scaling factor.

#### 4. Queue Non-Critical Work

- async logging
- notifications
- analytics
- post-processing jobs

Why:
The API should stay fast for user-facing requests.

#### 5. Control LLM Cost and Latency

- send only recent relevant history
- cache repeated prompt context where possible
- add rate limiting
- use smaller or cheaper models for lower-risk tasks

Why:
LLM calls are slower and more expensive than normal application logic.

## 12. What If Traffic Suddenly Spikes

If traffic increases suddenly, likely failure points are:

- too many simultaneous LLM requests
- database connection saturation
- longer response times
- duplicate retries from impatient users

### Immediate protections I would add

- API rate limiting
- request queueing for chat processing
- circuit breaker/fallback when LLM provider is slow
- connection pool tuning
- caching for frequently requested event data
- autoscaling backend instances

### Graceful degradation strategy

If the AI service becomes slow or unavailable, I would still allow:

- login
- event listing
- non-chat admin operations

And for chat:

- show a retry message
- preserve the draft
- allow the user to continue later

Why:
One dependency should not take down the entire system.

## 13. Security Design

### Current Security Measures

- JWT-based authentication
- protected routes
- role-based access control
- session ownership verification
- CORS configuration
- security headers
- backend validation
- parameterized SQL queries
- bounded message size for chat input

### Why these choices matter

Because an AI-enabled app still needs normal backend security discipline. AI features do not replace authentication, authorization, input validation, or safe database access.

## 14. Production-Readiness Improvements

If asked, "How would you make this production-ready?", this is a strong answer:

### 1. Add Automated Testing

- unit tests for services
- integration tests for API flows
- end-to-end tests for chat and event creation

Why:
Production systems need confidence during deployment.

### 2. Add Better Observability

- structured logs
- metrics
- request tracing
- alerting dashboards

Why:
When failures happen in production, fast diagnosis matters.

### 3. Add Rate Limiting and Abuse Protection

Why:
LLM-backed endpoints are especially vulnerable to misuse and cost spikes.

### 4. Improve Secret Management

- environment-based configuration
- managed secret store
- key rotation

Why:
Production security should not depend on local file handling.

### 5. Add Background Workers

Why:
Notifications, reminders, and audit pipelines should not block user requests.

### 6. Add Object Storage for Banner Uploads

Why:
Right now the system uses banner URLs. A production system should support real media upload with storage like S3-compatible services.

### 7. Add Stronger Monitoring Around the AI Layer

- latency monitoring
- provider error rate tracking
- token usage tracking
- fallback behavior tracking

Why:
The AI layer is a major operational dependency.

### 8. Add Better Session Expiry and Cleanup Jobs

Why:
High-scale chat systems need controlled lifecycle management for drafts and temporary session records.

## 15. What I Would Do Differently

This is a valuable reflection section for interviews.

### 1. Add a Dedicated AI Gateway Layer Earlier
Right now the AI orchestration is service-based inside the backend. If the project grew faster, I would isolate prompt handling, provider fallback, and model policies into a clearer AI gateway module.

Why:
It would make model changes and prompt versioning easier to manage.

### 2. Use Redis Earlier for Active Chat State
For a larger production target, Redis would be better for active session performance.

Why:
Chat is high-frequency and stateful.

### 3. Expand Automated Test Coverage Earlier
I would invest earlier in integration and conversation-flow testing.

Why:
AI-assisted flows are more dynamic, so regression testing becomes more important.

### 4. Add a Human Fallback UX
If AI extraction fails repeatedly, I would allow a structured manual correction mode without leaving the workflow.

Why:
Production systems should degrade gracefully, not just fail gracefully.

## 16. Key Design Trade-Offs

### Trade-Off 1: AI Flexibility vs Deterministic Reliability

Decision:
Use AI for extraction, but validate with backend code.

Why:
This keeps the user experience flexible while keeping the data trustworthy.

### Trade-Off 2: Database Persistence vs Simplicity

Decision:
Store chat sessions in PostgreSQL instead of temporary memory.

Why:
This added complexity, but it made the system durable and multi-user friendly.

### Trade-Off 3: Layered Architecture vs Fast Prototype

Decision:
Use controllers, services, and repositories.

Why:
It takes more structure upfront, but it makes future maintenance much easier.

### Trade-Off 4: Confirmation Before Commit vs One-Step Save

Decision:
Require explicit confirmation before creating the event.

Why:
This reduces accidental writes and gives the user more control.

## 17. Best Short Interview Explanation

If you need to explain the project in a short answer, you can say:

"I built an AI-assisted event management system where admins create and update events through conversation instead of using long forms. The frontend is built in React, the backend uses Node.js and Express, PostgreSQL stores users, events, role mappings, and chat sessions, and an LLM API helps extract structured event data from natural language. I designed it so AI handles understanding, but the backend still performs strict validation, confirmation, and persistence. I chose that architecture because it gives a better user experience without sacrificing reliability, security, or scalability."

## 18. Best Long Interview Explanation

If you need a more detailed explanation, you can say:

"The main problem I solved was reducing the friction of event creation. Normally admins have to fill many fields manually, so I designed a chat-first workflow where they can describe the event naturally. The frontend creates or restores a chat session, the backend stores the session and draft state in PostgreSQL, and each user message is sent to an LLM API that extracts structured fields such as title, status, dates, timezone, and roles. I did not rely on AI alone, because AI can be inconsistent, so after extraction the backend normalizes and validates everything with deterministic rules. Once the draft is complete, the system asks for explicit confirmation, then saves the event and its role mappings into PostgreSQL. I used a layered architecture with controllers, services, and repositories so the system is easier to maintain and scale. If traffic grows, I would scale the stateless API horizontally, move hot session state to Redis, optimize database access, and add rate limiting and better observability around the AI layer." 

## 19. Strong Answers to Likely Questions

### Why did you choose this architecture?
I chose a layered architecture because it separates HTTP handling, business logic, AI orchestration, and database access. That makes the system easier to maintain, test, and scale.

### Why not trust the AI directly?
Because natural language understanding is useful, but business correctness should stay deterministic. AI helps interpret, while backend validation protects data quality.

### How would you scale it?
I would horizontally scale the backend, optimize database access, move active chat state to Redis if needed, queue non-critical work, and add rate limiting around LLM-heavy endpoints.

### What happens if traffic increases?
The first pressure points would be the LLM calls and database writes. I would reduce prompt size, control concurrency, add caching, and scale backend/database resources.

### How do you handle errors?
I handle them through request validation, auth checks, session ownership checks, defensive AI parsing, duplicate prevention, centralized error middleware, and logging.

### What would you improve next?
Automated tests, observability, Redis-based session optimization, object storage for banners, better AI fallback behavior, and production-grade monitoring.

## 20. Final Project Positioning

The strongest way to present this project is:

This is not just a chatbot.

This is a structured event management system that uses AI only where AI adds value, and uses standard software engineering practices everywhere else.

That is the main reason the design is strong:

- better user experience than forms
- safer than a pure AI workflow
- more scalable than a one-file prototype
- closer to a real production architecture
