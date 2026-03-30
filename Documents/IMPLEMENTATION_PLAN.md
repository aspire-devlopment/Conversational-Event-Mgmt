# Event Creation Chatbot - Simplified Implementation Plan (Updated with OpenAI GPT)

**Current Approach**: 
- OpenAI GPT-powered conversation layer (natural language understanding)
- Microservices architecture (backend only - separate Node services)
- No Docker/Kubernetes (run locally, scale later)
- No message queues (direct service calls for now)
- File-based logging + session storage
- Use existing database tables (events, users, roles)
- Simple single-machine deployment

---

## Phase 1: Core Chat Service Implementation (Week 1)

### 1.1 Chat Service (Port 5001)

**Endpoints**:
```javascript
POST /chat/message
  Request: { userId, sessionId, message, language }
  Response: { sessionId, botMessage, suggestedActions, eventDraft }

POST /chat/session
  Request: { userId, language }
  Response: { sessionId, createdAt, expiresAt }

GET /chat/session/:sessionId
  Response: { userId, language, conversationHistory, eventDraft }

DELETE /chat/session/:sessionId
  Response: { success }

POST /chat/event/create
  Request: { sessionId, eventData: { title, dateTime, location } }
  Response: { eventId, createdAt, success }
```

**Database Tables Used**:
- `events` - Store created events
- `users` - User context
- `roles` - User role/permissions

**Chat Session Storage**:
```sql
-- Session stored in local JSON file or simple in-memory store
-- Fallback: Can store in PostgreSQL if needed
{
  sessionId: UUID,
  userId: UUID,
  language: 'en',
  step: 0,  // Conversation step
  eventDraft: {
    title: '',
    date_time: '',
    location: '',
    description: ''
  },
  conversationHistory: [
    { role: 'bot', content: '...' },
    { role: 'user', content: '...' }
  ],
  createdAt: timestamp,
  expiresAt: timestamp (24h)
}
```

---

## Phase 1: Core Chat Service with OpenAI GPT Integration (Week 1) - ✅ IMPLEMENTED

### 1.1 Chat Service (Port 5001) with GPT - ✅ COMPLETE

**Key Difference**: Uses OpenAI GPT instead of pattern matching for natural language understanding

**Endpoints** (Already Implemented):
```javascript
POST /api/chat/session
  Request: { userId, language }
  Response: { sessionId, message: "greeting from GPT", language }

POST /api/chat/message
  Request: { userId, sessionId, message, language }
  Response: { 
    sessionId, 
    botMessage: "GPT response",
    intent: "provide_title|provide_date|confirm|clarify",
    eventDraft: { title, dateTime, location, description },
    eventCreated: boolean,
    createdEventId: UUID
  }

GET /api/chat/session/:sessionId
  Response: { userId, language, conversationHistory, eventDraft, state }

DELETE /api/chat/session/:sessionId
  Response: { success }
```

**Database Tables Used**:
- `events` - Store created events
- `users` - User context  
- `roles` - User permissions

**Session Storage** (File-based with DB fallback):
```
backend/sessions/ (File storage)
├── {sessionId-1}.json
├── {sessionId-2}.json
└── ... (Auto-expires after 24 hours)

Each session file:
{
  sessionId: UUID,
  userId: UUID,
  language: 'en',
  state: 'init|collecting|confirming|completed',
  eventDraft: {
    title: '',
    dateTime: '',
    location: '',
    description: ''
  },
  conversationHistory: [
    { role: 'bot', content: 'GPT message', timestamp: ISO },
    { role: 'user', content: 'User message', timestamp: ISO }
  ],
  createdAt: timestamp,
  expiresAt: timestamp (24h)
}
```

### 1.2 OpenAI GPT Integration - ✅ COMPLETE

**Service File**: `backend/services/openaiService.js`

**Key Functions**:
```javascript
async processMessage(userMessage, conversationHistory, currentEventData, language)
  - Calls OpenAI API (gpt-3.5-turbo or gpt-4)
  - Extracts user intent and event data
  - Returns: { intent, extractedData, message, nextStep, confidence }

async generateGreeting(language)
  - Generates personalized greeting from GPT
  - Falls back to hardcoded greeting if API fails

function validateEventData(eventData)
  - Checks if title and dateTime are provided
  - Returns: { valid, missingFields }

function parseDateTime(dateString)
  - Parses natural language dates
  - Handles: "tomorrow at 3pm", "Jan 15", "next week", etc
```

**System Prompt** (Guides GPT):
```
You are an event creation assistant.
Collect: Title (required), Date/Time (required), Location (optional), Description (optional)

Extract values from user messages and clarify ambiguous inputs.
Respond ONLY in JSON format:
{
  "intent": "provide_title|provide_date|provide_location|describe|confirm|clarify|cancel",
  "extractedData": {
    "title": "extracted title or null",
    "dateTime": "YYYY-MM-DD HH:mm or null",
    "location": "extracted location or null",
    "description": "text or null"
  },
  "nextStep": "which field to ask about next",
  "message": "Your conversational response to the user",
  "confidence": 0.95
}
```

**Conversation Example with GPT**:
```
User: "Schedule a team meeting tomorrow at 2pm in the main conference room"

1. ChatController → OpenAI GPT + context
   - Sends: System prompt + message + eventDraft

2. GPT Response (JSON):
   {
     "intent": "provide_all",
     "extractedData": {
       "title": "team meeting",
       "dateTime": "2026-01-16 14:00",
       "location": "main conference room",
       "description": null
     },
     "message": "Perfect! I've got your team meeting scheduled...",
     "nextStep": "confirm",
     "confidence": 0.98
   }

3. ChatController processes:
   - Updates eventDraft with all fields
   - Validates (title + dateTime present)
   - Asks for confirmation

4. User: "Yes, create it"
   → GPT classifies as "confirm"
   → ChatController creates event in DB
   → Session cleared
   → Returns eventCreated: true
```

### 1.3 Session Repository - ✅ COMPLETE

**File**: `backend/repositories/chatSessionRepository.js`

**Features**:
- Database-first approach (PostgreSQL chat_sessions table)
- Automatic fallback to file storage if DB unavailable
- Session expiration (24 hours auto-cleanup)
- Hybrid storage model

**Methods**:
```javascript
async create(payload)          // Create new session
async getById(id)              // Retrieve session
async update(id, payload)      // Update session
async addMessage(id, role, content)  // Add to conversation
async updateEventDraft(id, eventData)  // Update eventDraft
async remove(id)               // Delete session
```

### 1.4 Chat Controller - ✅ COMPLETE

**File**: `backend/controllers/chatController.js`

Orchestrates GPT integration with session management:

```javascript
POST /api/chat/session
  ✓ Validates userId
  ✓ Creates session in repository
  ✓ Generates GPT greeting
  ✓ Returns sessionId + greeting

POST /api/chat/message
  ✓ Retrieves session context
  ✓ Builds conversation history
  ✓ Calls openaiService.processMessage()
  ✓ Extracts and validates event data
  ✓ Updates eventDraft if needed
  ✓ On "confirm" intent: creates event in DB
  ✓ Returns GPT response + extracted data
  ✓ Clears session on event creation

GET /api/chat/session/:sessionId
  ✓ Returns full session (history + draft)

DELETE /api/chat/session/:sessionId
  ✓ Removes session
```

### 1.5 Chat Routes - ✅ COMPLETE

**File**: `backend/routes/chatRoutes.js`

Routes require JWT authentication:
```
POST   /api/chat/session - Create session
POST   /api/chat/message - Send message
GET    /api/chat/session/:sessionId - Get session
DELETE /api/chat/session/:sessionId - Delete session
```

### 1.6 Server Integration - ✅ COMPLETE

**Updated**: `backend/server.js`
- Added chatRoutes import
- Registered `/api/chat` route
- Maintains existing authentication

### 1.7 Dependencies - ✅ INSTALLED

```bash
npm install uuid openai
```

Added packages:
- `uuid` - Session ID generation
- `openai` - OpenAI API client (native HTTPS implementation)

### 1.8 Environment Configuration - ✅ UPDATED

**File**: `backend/.env`

```dotenv
# New: OpenAI GPT Configuration
OPENAI_API_KEY=sk-...  (From openai.com/api_keys)
OPENAI_MODEL=gpt-3.5-turbo
```

---

## Implementation Complete ✅

All backend components for GPT-powered chat are implemented and ready:
- [x] OpenAI service with prompt engineering
- [x] Session repository (file + DB hybrid)
- [x] Chat controller orchestration
- [x] Chat routes with JWT auth
- [x] Server integration
- [x] Dependencies installed
- [x] Environment configuration

**Next Phase**: Frontend Chat UI update (AdminChatPage.jsx)

---

## Phase 2: Frontend Chat UI Update (Week 2) - ⏳ READY TO START

---

---

### 1.2 Intent/NLP Service - ⚠️ NOT NEEDED

**Removed**: GPT now handles intent classification and entity extraction natively.

The system prompt in `openaiService.js` replaces the need for a separate NLP service.

---

### 1.3 Localization Service - ⚠️ SIMPLIFIED

**Removed**: GPT handles multi-language responses natively.

The system prompt is translated and GPT responds in the requested language.

Future enhancement: Add language-specific date parsing and timezone support.

---

## Phase 2: Frontend Chat UI Update (Week 2) - ⏳ READY TO START

**Endpoints**:
```javascript
POST /i18n/detect-language
  Request: { text }
  Response: { language, confidence }

GET /i18n/messages/:language
  Response: { messages: { bot.greeting, bot.ask_title, ... } }

POST /i18n/format-date
  Request: { date, timezone, language }
  Response: { formatted, display }
```

**Languages Supported** (Initial):
- English (en)
- Spanish (es)
- French (fr)

**Messages Database**:
```javascript
const messages = {
  en: {
    'bot.greeting': 'Hi! I can help you create an event. What would you like to call it?',
    'bot.ask_title': 'What should we call this event?',
    'bot.ask_date': 'When would you like to schedule it?',
    'bot.ask_location': 'Where will this event take place?',
    'bot.ask_description': 'Add any additional details (optional)',
    'bot.confirm': 'Perfect! Here\'s your event:\n{event}\n\nShould I create it?',
    'bot.success': 'Great! Your event has been created.',
    'event.created': 'Event "{title}" created successfully on {date}'
  },
  es: {
    'bot.greeting': '¡Hola! Puedo ayudarte a crear un evento. ¿Cómo te gustaría llamarlo?',
    'bot.ask_title': '¿Cómo se debe llamar este evento?',
    'bot.ask_date': '¿Cuándo te gustaría programarlo?',
    'bot.ask_location': '¿Dónde se llevará a cabo este evento?',
    'bot.ask_description': 'Agrega más detalles (opcional)',
    'bot.confirm': '¡Perfecto! Aquí está tu evento:\n{event}\n\n¿Debo crearlo?',
    'bot.success': '¡Genial! Tu evento ha sido creado.',
    'event.created': 'Evento "{title}" creado exitosamente el {date}'
  },
  fr: {
    'bot.greeting': 'Bonjour! Je peux vous aider à créer un événement. Comment aimeriez-vous l\'appeler?',
    'bot.ask_title': 'Comment devrait s\'appeler cet événement?',
    'bot.ask_date': 'Quand aimeriez-vous le programmer?',
    'bot.ask_location': 'Où aura lieu cet événement?',
    'bot.ask_description': 'Ajoutez des détails supplémentaires (optionnel)',
    'bot.confirm': 'Parfait! Voici votre événement:\n{event}\n\nDois-je le créer?',
    'bot.success': 'Super! Votre événement a été créé.',
    'event.created': 'Événement "{title}" créé avec succès le {date}'
  }
}
```

**Language Detection**:
```javascript
---

## Conversation Flow Example (GPT-Powered)

```
User Creates Chat Session
    ↓
ChatController → openaiService.generateGreeting()
    ↓
GPT Response: "Hi! I can help you create an event. What would you like to call it?"
    ↓
Session created with initial greeting
    ↓

User: "Schedule a team meeting for January 15 at 3pm in Conference Room A"
    ↓
ChatController → openaiService.processMessage()
    - Sends: User message + system prompt + conversationHistory + eventDraft
    ↓
GPT processes with system prompt, returns JSON:
{
  "intent": "provide_all",
  "extractedData": {
    "title": "team meeting",
    "dateTime": "2026-01-15 15:00",
    "location": "Conference Room A",
    "description": null
  },
  "message": "Perfect! I've got your team meeting set for January 15 at 3pm in Conference Room A. Should I create it?",
  "nextStep": "confirm",
  "confidence": 0.97
}
    ↓
ChatController updates eventDraft with extractedData
    ↓
Bot responds with GPT message + asks for confirmation

User: "Yes, create it"
    ↓
ChatController → openaiService.processMessage()
    ↓
GPT classifies intent as "confirm"
    ↓
ChatController validates eventDraft (has title + dateTime)
    ↓
ChatController creates event in database:
  INSERT INTO events (title, date_time, location, created_by_user_id, created_via_chat, ...)
    ↓
Bot: "Done! Your event has been created."
    ↓
Session deleted (cleanup)
```

**Advantages of GPT Approach**:
- ✅ Natural language understanding (no pattern matching)
- ✅ Multi-turn context awareness
- ✅ Flexible field extraction
- ✅ Multi-language support natively
- ✅ Conversational and adaptive
- ✅ Handles abbreviations and informal language

---

## Database Schema (Existing Tables Only)

### Events Table (Existing - No Changes)
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  created_by_user_id UUID NOT NULL,
  role_created VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);
```

### Additional Optional Field for Chat Tracking
```sql
-- Optional: Add to existing events table
ALTER TABLE events ADD COLUMN created_via_chat BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN chat_session_id UUID;

-- If storing chat session history:
CREATE TABLE chat_sessions_archive (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  language VARCHAR(10),
  conversation_history JSONB,
  event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);
```

---

## File Structure (GPT Implementation - ✅ COMPLETE)

```
backend/
├── routes/
│   ├── chatRoutes.js               ✅ (NEW - /api/chat endpoints with GPT)
│   └── ...existing routes
├── controllers/
│   ├── chatController.js           ✅ (NEW - GPT orchestration & session mgmt)
│   └── ...existing controllers
├── services/
│   ├── openaiService.js            ✅ (NEW - OpenAI GPT integration)
│   ├── passwordService.js          ✅ (Existing - Password hashing)
│   └── ...existing services
├── repositories/
│   ├── chatSessionRepository.js    ✅ (UPDATED - Hybrid DB/file storage)
│   └── ...existing repositories
├── sessions/                        ✅ (NEW - Session file storage)
│   ├── {sessionId-1}.json
│   ├── {sessionId-2}.json
│   └── ...
├── logs/                            ✅ (File-based logging)
│   ├── chat-2026-01-15.log
│   ├── auth-2026-01-15.log
│   └── ...
├── utils/
│   ├── logger.js                   ✅ (File-based logger)
│   └── ...existing utils
├── middleware/
│   ├── asyncHandler.js             ✅ (Error handling)
│   └── ...existing middleware
├── .env                            ✅ (UPDATED - OPENAI_API_KEY config)
├── server.js                       ✅ (UPDATED - Chat routes integrated)
└── package.json                    ✅ (UPDATED - uuid, openai added)
```

**Key Files Implemented**:
- `services/openaiService.js` - GPT API client with prompt engineering
- `controllers/chatController.js` - Session + GPT orchestration
- `routes/chatRoutes.js` - HTTP endpoints with JWT auth
- `repositories/chatSessionRepository.js` - File/DB session storage
- `server.js` - Route registration
- `.env` - OpenAI configuration
└── sessions/
    └── (Store session JSON files here locally)
```

---

## Phase 2: Frontend Chat UI (Week 2)

### Update AdminChatPage.jsx
```javascript
import React, { useState, useEffect } from 'react'

export default function AdminChatPage() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Hi! I can help you create an event.' }
  ])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Create chat session on mount
    initializeSession()
  }, [])

  const initializeSession = async () => {
    try {
      const response = await fetch('http://localhost:5001/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, language: 'en' })
      })
      const data = await response.json()
      setSessionId(data.sessionId)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: input }])
    setInput('')
    setLoading(true)

    try {
      // Call Chat Service
      const response = await fetch('http://localhost:5001/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          sessionId,
          message: input,
          language: 'en'
        })
      })

      const data = await response.json()
      
      // Add bot response
      if (data.botMessage) {
        setMessages(prev => [...prev, { role: 'bot', content: data.botMessage }])
      }

      // Show suggested actions if available
      if (data.suggestedActions) {
        console.log('Suggested actions:', data.suggestedActions)
      }

      // If event created, show confirmation
      if (data.eventCreated) {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: `✓ Event "${data.eventTitle}" has been created!` 
        }])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
```

---

## Logging Strategy (File-Based)

```javascript
// backend/utils/logger.js
const fs = require('fs')
const path = require('path')

const logDir = path.join(__dirname, '../logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

const getLogDate = () => new Date().toISOString()

const log = (level, service, message, data = {}) => {
  const timestamp = getLogDate()
  const logEntry = {
    timestamp,
    level,
    service,
    message,
    ...data
  }

  // Write to console (development)
  console.log(`[${level}] ${service}: ${message}`)

  // Write to log file
  const logFile = path.join(logDir, `${service}-${new Date().toISOString().split('T')[0]}.log`)
  fs.appendFileSync(
    logFile,
    JSON.stringify(logEntry) + '\n',
    { encoding: 'utf8' }
  )
}

module.exports = {
  info: (service, message, data) => log('INFO', service, message, data),
  error: (service, message, data) => log('ERROR', service, message, data),
  warn: (service, message, data) => log('WARN', service, message, data),
  debug: (service, message, data) => log('DEBUG', service, message, data)
}
```

**Log Files Generated**:
- `logs/chat-service-2026-01-15.log`
- `logs/intent-service-2026-01-15.log`
- `logs/localization-service-2026-01-15.log`

---

## Implementation Checklist

- [ ] Create Chat Service routes & controller
- [ ] Create Intent Service with intent classification
- [ ] Create Localization Service with language detection
- [ ] Implement SessionService with file/memory-based storage
- [ ] Add conversation flow step management
- [ ] Create Chat UI in AdminChatPage.jsx
- [ ] Test end-to-end chat flow
- [ ] Add date/timezone parsing
- [ ] Add language detection (franc library)
- [ ] Document API contracts
- [ ] Test with multiple languages
- [ ] Set up file-based logging
- [ ] Manual testing of event creation through chat

---

## Future Enhancements (Post-MVP)

- [ ] Add message queue (RabbitMQ/Kafka) for async operations
- [ ] Implement WebSocket for real-time chat
- [ ] Add Docker containerization
- [ ] Deploy to Kubernetes
- [ ] Add Prometheus metrics & monitoring
- [ ] Add Jaeger distributed tracing
- [ ] Implement more sophisticated NLP models
- [ ] Add sentiment analysis
- [ ] Multi-region deployment
- [ ] Database replication & failover
