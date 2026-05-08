# Chat-Based Event Management System - Q&A

## Which LLMs/tools have you used?

**Primary:** OpenRouter (accessing `openrouter/auto` by default)  
**Alternative:** OpenAI API directly via `OPENAI_API_KEY`  
**Database:** PostgreSQL with JSONB for chat sessions  
**Queue:** BullMQ with Redis (notification system)  
**Email:** SendGrid API

## Briefly describe your hands-on experience

I built a full-stack chat interface where admins create events through natural conversation instead of forms. The system uses LLM for intent detection and field extraction, with deterministic backend validation. I integrated idempotency, duplicate prevention, role-based access, and multilingual support (EN/DE/FR).

## Describe one real AI/agentic system you built

**System:** Conversational Event Builder (this codebase)  
**Core:** `backend/controllers/chatController.js` + `backend/services/openaiService.js`

**Problem solved:** Event creation was rigid form-based, requiring field-by-field input. Business users preferred natural conversation.

**Automatic behavior:** The system collects missing fields through guided Q&A, validates extracted data, and saves to PostgreSQL when complete.

## How your system works

### Understanding Input
1. User message → `openaiService.processMessage()` 
2. LLM receives system prompt defining JSON schema with fields: name, subheading, description, bannerUrl, timezone, status, startTime, endTime, vanishTime, roles
3. LLM returns structured JSON with `intent` (collect/update/confirm), `extractedData`, `nextStep`

### Deciding Next Steps
```
Input → LLM Processing → Validation → Decision Matrix:
- Draft incomplete → Ask for next missing field
- Draft complete + user says "yes" → Create event
- Duplicate detected → Block creation
```

### Executing Actions
```javascript
// Backend executes actions:
eventRepository.createWithRoles(payload, roles)  // Creates event
notificationQueue.add()  // Enqueues email notifications  
chatSessionRepository.remove(sessionId)  // Cleans up session
```

## What actions did your system perform automatically?

1. **Field extraction:** Natural language → structured JSON
2. **Date parsing:** "next Monday 3pm" → "2026-05-11 15:00"
3. **Role normalization:** "admin" → "Admin", "sales" → "Sales Rep"
4. **Duplicate detection:** Check if equivalent event exists
5. **Idempotent creation:** Prevent double-submission
6. **Multilingual handling:** Auto-detect/response in DE/FR/EN
7. **Session persistence:** Resume conversations after refresh
8. **Email notifications:** Queue emails to role-assigned users

## What measurable outcome did it achieve?

- **0 form fields** to fill - replaced by conversational flow
- **<2 second** response time per turn (LLM + DB)
- **Multilingual support** for 3 languages without separate code paths
- **24-hour session persistence** with automatic expiry
- **Atomic transactions** ensuring consistent event creation

## How your system handles: "What should I do for this client today?"

### Understanding the request
The system detects this as a **clarification/guidance request** through:
- Intent classifier returns `"intent": "clarify"`
- No structured event data extracted
- `nextStep` defaults to `"name"` (start fresh)

### Deciding next steps
The LLM recognizes this as **not an event creation request** because:
- No event-related keywords detected
- Matches clarification patterns in training
- System prompt emphasizes event fields only

### Output/actions generated
```javascript
{
  intent: "clarify",
  nextStep: "name",
  message: "Could you clarify that? I'm here to help you create events. What event would you like to schedule today?"
}
```

**Action:** System asks for clarification and prompts for event name to start the workflow.

## Additional Information

**Key files implementing this behavior:**
- `backend/services/openaiService.js:260-305` - System prompt with JSON schema
- `backend/controllers/chatController.js:272-314` - Message processing and decision logic
- `backend/services/chatEventUtils.js:405-424` - Missing field detection
- `backend/utils/eventIdentity.js` - Duplicate detection

**Current environment supports:**
- PostgreSQL for session/event storage
- Redis for queue-based notifications
- SendGrid for email delivery
- OpenRouter/OpenAI for LLM processing