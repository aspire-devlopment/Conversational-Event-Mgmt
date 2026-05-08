# Agentic AI Interview Preparation

## Event Management System Overview

**Production Tech Stack:**
- **Frontend:** React + JavaScript
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (with JSONB for chat sessions)
- **LLM Provider:** OpenRouter (with OpenAI as fallback)
- **Queue:** BullMQ with Redis (notifications)
- **Email:** SendGrid API
- **Auth:** JWT tokens
- **Deployment:** Docker containers

**Data Flows:**
```
User Message → Controller → LLM (OpenRouter) → JSON Response → Validation → Database → Response
     ↓
Notification Queue (background) → Email Service
```

## Agentic Approach Details

### 1. Planning
- **State Machine Pattern:** Collecting → Confirming → Completed states
- **Next Field Detection:** `getNextStep()` determines what to ask next
- **Missing Fields Tracking:** `getMissingFields()` returns priority order

### 2. Tool Routing
- **Single LLM:** OpenRouter with JSON schema enforcement
- **Deterministic Parsing:** `tryParseStructuredLlmContent()` extracts JSON from any format
- **Backup Handling:** Fallback messages in 3 languages (EN/DE/FR)

### 3. Guardrails
- **Input Validation:** `validateEventData()` - deterministic backend rules
- **Duplicate Prevention:** `findEquivalentEvent()` - database-level checks
- **Idempotency:** Request hashing prevents double-submission
- **Role Authorization:** Only Admin role can create events
- **Date Validation:** start < end < vanish time enforced

## Production Context

### Current Deployment
- Docker-compose for PostgreSQL + Redis + Backend + Frontend
- Environment variables for all secrets/API keys
- 24-hour session expiry with cleanup

### Automation Boundaries
- LLM handles natural language extraction only
- Database operations always wrapped in transactions
- Email notifications are queued (retry = 3 attempts)
- No automatic retries for failed LLM calls

## Key Technical Decisions

### Why OpenRouter?
- Single endpoint for multiple model providers
- Fallback (`openrouter/auto`) ensures availability
- Consistent JSON response format

### Why JSONB for Sessions?
- Supports structured session state
- Enables indexing on metadata fields
- Fast fallback to file storage if DB fails

### Why BullMQ vs SQS?
- Local development simplicity (Redis included in Docker)
- SQS path available via `sqsService.js`
- Same queue interface pattern for both

## Expected Discussion Points

### 1. Production System Context
```
Q: How would you scale this to 10k concurrent chat sessions?
A: Redis clustering, read replicas for PostgreSQL, 
   horizontal scaling of backend containers,
   CDN for static assets, connection pooling
```

### 2. Agentic Approach
```
Q: How does your system decide what to do next?
A: getNextStep() returns next missing field, 
   isConfirmationMessage() detects user approval,
   validation determines if ready to commit
```

### 3. Tool Routing
```
Q: What tools does your agent use?
A: OpenRouter LLM for extraction, 
   PostgreSQL for state, 
   Redis Queue for background tasks,
   SendGrid for email delivery
```

### 4. Guardrails
```
Q: How do you ensure data quality?
A: Backend validation after extraction,
   idempotency keys, duplicate detection,
   SQL constraints (start < end < vanish)
```

## Common Interview Questions & Answers

### Q: Describe a challenging bug you solved
```
A: Message history context overflow causing 
   "Invalid JSON" errors. Fixed by slicing 
   conversation history to last 14 messages 
   (chatController.js:266)
```

### Q: How would you add a new field (e.g., venue)?
```
A: 1. Add to EVENT_FIELD_INFO in chatEventUtils.js
   2. Add to getMissingFields() order
   3. Update system prompt in getSystemPrompt()
   4. Add database column if needed
```

### Q: How do you handle LLM failures?
```
A: Fallback messages in 3 languages,
   retry logic in tryParseStructuredLlmContent(),
   circuit breaker pattern for API timeout
```

### Q: What's your approach to testing?
```
A: Unit tests for extractors in chatEventUtils.test.js,
   integration tests for repository layer,
   manual testing for LLM responses (non-deterministic)
```

## AtomCI Build Expectations

### Availability
- **Immediate start:** Yes (existing codebase ready)
- **Tech stack match:** Yes (JavaScript/React/PostgreSQL)
- **Domain match:** Event management / admin interfaces

### What to emphasize
- Conversational UI over forms
- Multitenancy via role-based access
- Idempotent operations for reliability
- Queue-based background processing
- Multilingual support without duplication