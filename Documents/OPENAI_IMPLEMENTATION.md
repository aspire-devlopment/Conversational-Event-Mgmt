# Event Creation Chatbot - Implementation Process

## Executive Summary

This document outlines the implementation strategy for an intelligent event creation chatbot that guides admins through event configuration via natural conversation. The system uses AI-like conversational flow with step-by-step guidance, language detection, input validation, and flexible date parsing.

**Target Users**: Admin users  
**Primary Function**: Guide event creation through conversation  
**Languages Supported**: English, Spanish, French  
**Delivery Method**: Chat interface in existing admin dashboard  

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Development Phases](#development-phases)
3. [Technology Stack](#technology-stack)
4. [Implementation Details](#implementation-details)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Plan](#deployment-plan)

---

## System Architecture

### High-Level Components

```
┌──────────────────┐
│   React Chat UI  │  ← User interacts with chatbot interface
└────────┬─────────┘
         │ HTTP REST
         ▼
┌──────────────────────────┐
│  ChatbotController       │  ← Handles HTTP requests/responses
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  ChatbotService          │  ← Core business logic
│  + Intent detection      │
│  + Language handling     │
│  + Conversation flow     │
│  + Validation            │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  SessionRepository       │  ← Chat session persistence
│  EventRepository         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  PostgreSQL Database     │  ← Data storage
└──────────────────────────┘
```

### Key Responsibilities

**Frontend (React)**
- Display chat messages in conversation format
- Render suggested action buttons
- Handle user input
- Show event creation progress
- Display language selector

**ChatbotController**
- Receive user messages
- Authenticate requests (JWT)
- Call ChatbotService
- Format responses
- Handle errors

**ChatbotService**
- Detect user language
- Parse user intent
- Manage conversation state
- Validate inputs
- Generate contextual responses
- Build event payload

**LocalizationService**
- Provide translated prompts
- Parse dates in different formats
- Format dates for display
- Manage multi-language strings

**Repositories**
- Persist chat sessions
- Retrieve event data
- Create events from chat
- Manage conversation context

---

## Development Phases

### Phase 1: Foundation (Week 1)

#### 1.1 Database Schema Updates
**Files to Create/Modify**:
- `backend/db/schema.sql` (or migration)
- Add `chat_sessions` table
- Add `language_strings` table
- Update `events` table with new columns

**Tasks**:
```sql
-- Create chat_sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_language VARCHAR(10) NOT NULL DEFAULT 'en',
  event_draft JSONB,
  conversation_step VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  CONSTRAINT valid_language CHECK (current_language IN ('en', 'es', 'fr'))
);

-- Create language_strings table
CREATE TABLE language_strings (
  id SERIAL PRIMARY KEY,
  language_code VARCHAR(10) NOT NULL,
  string_key VARCHAR(255) NOT NULL,
  translation TEXT NOT NULL,
  UNIQUE(language_code, string_key)
);

-- Update events table
ALTER TABLE events
ADD COLUMN created_via_chat BOOLEAN DEFAULT false,
ADD COLUMN roles TEXT[] DEFAULT ARRAY['Admin'];
```

#### 1.2 Backend Repository Layer
**Files to Create**:
- `backend/repositories/chatSessionRepository.js`

**Implementation**:
```javascript
// Methods needed:
// - create(userId, language)
// - getById(sessionId)
// - update(sessionId, data)
// - delete(sessionId)
// - getExpired() - for cleanup
```

**Files to Update**:
- `backend/repositories/eventRepository.js` - Add createFromChat method

#### 1.3 Localization Service
**Files to Create**:
- `backend/services/localizationService.js`

**Features**:
- Language detection from text
- Date parsing (flexible formats)
- Message translations
- Timezone options

---

### Phase 2: Core Business Logic (Week 2)

#### 2.1 Chatbot Service
**Files to Create**:
- `backend/services/chatbotService.js`

**Core Methods**:
```javascript
class ChatbotService {
  // Language & Context
  detectLanguage(text)
  
  // Intent Recognition
  identifyIntent(message, context)
  
  // State Management
  getConversationStep(context)
  advanceConversationStep(context)
  
  // Input Processing
  parseUserInput(message, field, context)
  validateInput(field, value, language)
  
  // Response Generation
  generateBotMessage(step, context, language)
  generateSuggestions(step, language)
  
  // Event Building
  buildEventPayload(eventDraft)
  validateEventCompletion(eventDraft)
}
```

**Conversation States**:
```
NAME → SUBHEADING → DESCRIPTION → BANNER_URL → 
TIMEZONE → STATUS → START_DATETIME → END_DATETIME → 
VANISH_DATETIME → ROLES → CONFIRM
```

#### 2.2 Intent Types
```javascript
const intents = {
  CREATE_EVENT: "User wants to create event",
  CHANGE_FIELD: "User wants to modify a field",
  CONFIRM_CREATE: "User confirms final event",
  SKIP_FIELD: "User skips optional field",
  HELP: "User asks for help",
  CANCEL: "User cancels event creation",
  ADD_ROLE: "User adds a role",
  REMOVE_ROLE: "User removes a role"
}
```

#### 2.3 Localization Data
**Files to Create**:
- `backend/constants/botMessages.js`

**Structure**:
```javascript
const messages = {
  en: {
    greeting: "Hi! Let's create an event together. What would you like to name it?",
    ask_name: "What would you like to name this event?",
    ask_subheading: "Provide a catchy subheading",
    ask_description: "Describe the event in detail",
    ask_banner: "Upload or provide banner image URL",
    ask_timezone: "Select event timezone",
    ask_status: "Set event status",
    ask_start_date: "When should the event start?",
    ask_end_date: "When should it end?",
    ask_vanish_date: "When should event disappear? (optional)",
    ask_roles: "Who can access this event?",
    confirm_details: "Here's your event summary. Ready to create?",
    success: "Event created successfully!",
    error_invalid: "That doesn't seem right. Please try again.",
    error_date_parse: "I couldn't parse that date. Try 'tomorrow 2pm' or 'April 15'",
    help_text: "I'm here to help you create an event..."
  },
  es: { /* Spanish translations */ },
  fr: { /* French translations */ }
}
```

---

### Phase 3: API Endpoints (Week 2-3)

#### 3.1 Chat Message Endpoint
**Files to Create**:
- `backend/controllers/chatbotController.js`
- `backend/routes/chatRoutes.js`

**Endpoint**: `POST /api/chat/message`

**Request**:
```json
{
  "sessionId": "uuid or null",
  "message": "I want to create an event",
  "language": "en"
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "uuid",
  "step": "NAME",
  "botMessage": "What would you like to name this event?",
  "suggestions": [],
  "eventDraft": {},
  "isComplete": false
}
```

**Logic Flow**:
1. Validate JWT (admin only)
2. Get or create session
3. Process message (parse intent)
4. Update context
5. Generate response
6. Save session
7. Return formatted response

#### 3.2 Create Event from Chat
**Endpoint**: `POST /api/events/from-chat`

**Request**:
```json
{
  "sessionId": "uuid",
  "confirm": true
}
```

**Logic**:
1. Get session
2. Validate event data
3. Create event in DB
4. Update user's created_events
5. Clear/archive session
6. Return event confirmation

#### 3.3 Get Session Context
**Endpoint**: `GET /api/chat/session/:sessionId`

**Response**: Full session data for recovery

---

### Phase 4: Frontend Implementation (Week 3-4)

#### 4.1 Chat Interface Component
**Files to Update**:
- `frontend/src/components/admin/AdminChatPage.jsx`

**Features**:
- Message display (bot + user)
- Input textarea
- Suggested action buttons
- Language selector dropdown
- Conversation state display
- Loading states

**State Management**:
```javascript
const [messages, setMessages] = useState([])
const [sessionId, setSessionId] = useState(null)
const [eventDraft, setEventDraft] = useState({})
const [currentStep, setCurrentStep] = useState(null)
const [language, setLanguage] = useState('en')
const [loading, setLoading] = useState(false)
```

#### 4.2 Message Sending Logic
```javascript
const sendMessage = async (userMessage) => {
  // 1. Add user message to history
  // 2. Send to backend
  // 3. Wait for bot response
  // 4. Add bot message to history
  // 5. Update state (step, eventDraft)
  // 6. Render suggestions if available
}
```

#### 4.3 Suggested Actions
**Button Types**:
- Text input field (for open-ended questions)
- Multi-choice buttons (timezone, status, roles)
- Date picker (for dates)
- Upload component (for banner)
- Checkbox list (for multi-select roles)

---

### Phase 5: Integration & Testing (Week 4)

#### 5.1 Unit Tests
**Backend Services**:
```
- chatbotService.js
  ✓ Language detection
  ✓ Intent classification
  ✓ Date parsing
  ✓ Input validation
  
- localizationService.js
  ✓ Message retrieval
  ✓ Date formatting
  
- chatSessionRepository.js
  ✓ CRUD operations
```

**Frontend Components**:
```
- ChatMessage rendering
- Input handling
- Message sending
- State updates
```

#### 5.2 Integration Tests
```
- Full conversation flow (create complete event)
- Language switching mid-conversation
- Error handling & recovery
- Session persistence
- Field corrections
- Event database creation
```

#### 5.3 E2E Tests
```
- User starts chat → creates event → event appears in list
- Language auto-detection works
- All fields properly validated
- Permissions enforced (admin only)
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language Detection**: `franc` or `textcat`
- **Date Parsing**: `date-fns` or `chrono-node` (natural language)
- **Database**: PostgreSQL with JSONB
- **Session Management**: In-memory cache + DB

### Frontend
- **Framework**: React
- **State**: useState/useContext or Redux
- **API Client**: Fetch API
- **Date Handling**: `date-fns`
- **Localization**: Built-in JSON system

---

## Implementation Details

### Language Detection Algorithm

```javascript
// Detect from message content
const detectLanguage = (text) => {
  const result = franc(text, { only: ['en', 'es', 'fr'] })
  
  // franc returns language code if confident
  // Fallback to English if low confidence
  return result === 'und' ? 'en' : result
}

// First message sets language for session
// User can override with language selector
```

### Date Parsing Strategy

```javascript
const parseFlexibleDate = (dateString, timezone) => {
  // Try multiple parsers in order:
  
  // 1. Relative dates: "tomorrow", "next Monday"
  const relative = parseRelativeDate(dateString)
  if (relative) return relative
  
  // 2. Natural language: "in 3 days", "2 weeks from now"
  const natural = chrono.parseDate(dateString)
  if (natural) return natural
  
  // 3. Common formats: "2026-04-15", "April 15, 2026"
  const parsed = parse(dateString, formats, new Date())
  if (isValid(parsed)) return parsed
  
  // Return validation error if all fail
  throw new Error("Could not parse date")
}
```

### Conversation State Management

```javascript
// Save to database after each message
const updateSession = async (sessionId, data) => {
  return await chatSessionRepository.update(sessionId, {
    conversation_data: {
      history: [...oldHistory, newMessage],
      timestamp: Date.now()
    },
    event_draft: newDraft,
    conversation_step: nextStep,
    updated_at: new Date()
  })
}

// Recover session on reconnect
const getSession = async (sessionId) => {
  return await chatSessionRepository.getById(sessionId)
}
```

### Validation Rules

```javascript
const validation = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
    regex: /^[a-zA-Z0-9\s\-&.,'()]+$/
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 1000
  },
  banner_url: {
    required: false,
    type: 'url',
    validDomains: ['imgur.com', 'unsplash.com', 'pexels.com', 'your-domain.com']
  },
  timezone: {
    required: true,
    enum: ['UTC', 'EST', 'CST', 'PST', 'IST', 'CET']
  },
  status: {
    required: true,
    enum: ['Draft', 'Published', 'Pending']
  },
  start_time: {
    required: true,
    type: 'datetime',
    minDate: 'now',
    minDate: 'end_time must be after start_time'
  },
  roles: {
    required: true,
    minItems: 1,
    enum: ['Admin', 'Manager', 'Sales Rep', 'Viewer']
  }
}
```

---

## API Response Structure

### Success Response
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "step": "SUBHEADING",
    "message": "Provide a catchy subheading for the event",
    "suggestions": [
      "Invite users to join",
      "Learn about our new product",
      "Network and connect"
    ],
    "eventDraft": {
      "name": "Tech Meetup 2026",
      "subheading": null,
      "description": null,
      ...
    },
    "isComplete": false,
    "conversationHistory": [...]
  },
  "timestamp": "2026-03-28T10:00:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Event name must be at least 3 characters",
    "suggestion": "Please provide a longer event name",
    "field": "name",
    "language": "en"
  },
  "timestamp": "2026-03-28T10:00:00Z"
}
```

### Event Creation Response
```json
{
  "success": true,
  "data": {
    "eventId": "123",
    "event": {
      "id": 123,
      "name": "Tech Meetup 2026",
      "created_via_chat": true,
      "created_by": 456,
      "created_at": "2026-03-28T10:05:00Z",
      ...
    },
    "message": "Event created successfully! 🎉",
    "sessionCleared": true
  }
}
```

---

## Testing Strategy

### Unit Test Examples

**Language Detection**
```javascript
describe('Language Detection', () => {
  it('detects English', () => {
    expect(detectLanguage('Hello world')).toBe('en')
  })
  
  it('detects Spanish', () => {
    expect(detectLanguage('Hola mundo')).toBe('es')
  })
  
  it('defaults to English on unclear text', () => {
    expect(detectLanguage('123 456')).toBe('en')
  })
})
```

**Date Parsing**
```javascript
describe('Date Parsing', () => {
  it('parses tomorrow', () => {
    const tomorrow = addDays(new Date(), 1)
    expect(parseFlexibleDate('tomorrow')).toEqual(tomorrow)
  })
  
  it('parses "next Monday 2pm"', () => {
    const result = parseFlexibleDate('next Monday 2pm')
    expect(result.getDay()).toBe(1) // Monday
    expect(result.getHours()).toBe(14)
  })
  
  it('rejects past dates', () => {
    expect(() => parseFlexibleDate('yesterday')).toThrow()
  })
})
```

### Integration Tests
```javascript
describe('Full Chat Flow', () => {
  it('creates event through conversation', async () => {
    // 1. Start session
    const session = await startChatSession(userId, 'en')
    
    // 2. Send message
    let response = await sendChatMessage(session.id, "I want to create event")
    expect(response.step).toBe('NAME')
    
    // 3. Continue conversation
    response = await sendChatMessage(session.id, "Tech Conference 2026")
    expect(response.eventDraft.name).toBe("Tech Conference 2026")
    expect(response.step).toBe('SUBHEADING')
    
    // ... continue through all steps
    
    // Final: Create event
    response = await confirmEventCreation(session.id)
    expect(response.eventId).toBeDefined()
    expect(response.success).toBe(true)
  })
})
```

---

## Deployment Plan

### Pre-Deployment Checklist
- [ ] All tests passing (unit + integration)
- [ ] Code review completed
- [ ] Database migrations prepared
- [ ] Error handling & logging verified
- [ ] Performance tested (load testing)
- [ ] Security audit completed
- [ ] Language strings localized
- [ ] Documentation updated

### Deployment Steps

1. **Database Migration**
   ```
   Run migration scripts:
   - Create chat_sessions table
   - Create language_strings table
   - Update events table
   - Seed initial translations
   ```

2. **Backend Deployment**
   ```
   - Deploy updated server code
   - Start new server instance
   - Verify endpoints responding
   ```

3. **Frontend Deployment**
   ```
   - Build React app
   - Deploy to CDN/server
   - Clear browser cache
   ```

4. **Verification**
   ```
   - Test chat flow end-to-end
   - Verify all languages working
   - Check event creation
   - Monitor error logs
   ```

### Rollback Plan
- Keep previous database backup
- Maintain server version control
- Have team member on standby
- Clear browser cache if issues

---

## Performance Considerations

### Optimization Strategies

1. **Message Caching**
   - Cache translated messages in Redis
   - Invalidate on content updates

2. **Session Management**
   - Auto-expire sessions after 24 hours
   - Archive old sessions monthly

3. **Database Queries**
   - Index `user_id` + `expires_at` on chat_sessions
   - Use JSONB efficiently

4. **Frontend Performance**
   - Lazy load chat component
   - Debounce message input
   - Optimize re-renders

### Monitoring Metrics
- Chat session creation rate
- Message response time (avg, p95)
- Event creation success rate
- Language distribution
- Error rates by type
- Database storage growth

---

## Security Considerations

1. **Authentication & Authorization**
   - All endpoints require JWT token
   - Admin role enforcement
   - User isolation (can only access own sessions)

2. **Input Validation**
   - Sanitize all user inputs
   - Prevent SQL injection
   - Validate file uploads

3. **Rate Limiting**
   - Max 100 messages per user per hour
   - Prevent spam/abuse

4. **Session Security**
   - Secure session tokens (UUID)
   - HTTPS only communication
   - HttpOnly cookies

5. **Data Privacy**
   - Encrypt sensitive data at rest
   - GDPR compliance (right to delete)
   - Data retention policies

---

## Future Enhancements

### Phase 2 Features
1. **Advanced AI Integration**
   - Real GPT-4 API for intelligent suggestions
   - Auto-generate event descriptions
   - Smart role recommendations

2. **Event Templates**
   - Pre-configured event types
   - Smart defaults based on template
   - Template customization

3. **Scheduling Assistant**
   - Recommend optimal event time
   - Check for conflicts
   - Suggest timezone-appropriate times

4. **Analytics**
   - Track event creation patterns
   - Popular event types
   - Admin usage analytics

5. **Integration**
   - Slack notifications on event creation
   - Calendar exports
   - API webhooks

### Phase 3 Features
1. **Multi-User Chat**
   - Collaborative event planning
   - Shared sessions between admins

2. **Event Modification via Chat**
   - Update existing events
   - Chat history for past events

3. **Advanced Localization**
   - Support more languages
   - Regional date/time formatting
   - Currency support for events

---

## Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Foundation | Week 1 | DB schema, repositories, tests |
| Phase 2: Business Logic | Week 2 | ChatbotService, intent detection |
| Phase 3: API & Endpoints | Week 2-3 | Chat endpoints, event creation |
| Phase 4: Frontend | Week 3-4 | Chat UI, message display |
| Phase 5: Testing & Polish | Week 4 | Integration tests, bug fixes |
| **Total** | **4 Weeks** | **Full MVP Ready** |

---

## Success Metrics

✅ Admin can create event entirely through chat  
✅ Language auto-detected from first message  
✅ All 10 fields collected with validation  
✅ Event created in database with correct metadata  
✅ Event appears in admin events list  
✅ Chat history maintained for user reference  
✅ <2 second response time per message  
✅ Zero security vulnerabilities  
✅ 95%+ test coverage  
✅ All 3 languages fully supported  

---

## Support & Maintenance

### Monitoring
- Daily error log review
- Weekly performance metrics
- Monthly user feedback review

### Maintenance Tasks
- Update language strings
- Monitor session cleanup
- Database optimization
- Security patches

### Support Channels
- In-app help button
- Documentation wiki
- Email support
- Chat support (future)

---

## Conclusion

This chatbot system provides an intelligent, conversational approach to event creation that improves user experience while maintaining data integrity. The phased approach allows for iterative development and testing, ensuring a robust final product.

For questions or clarifications, please contact the development team.
