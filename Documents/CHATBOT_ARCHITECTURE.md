# Event Creation Chatbot - Microservices Architecture

## Microservices System Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER (React)                                          │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  AdminChatPage.jsx                                                                           │
│  ├─ Chat Interface Component                                                                 │
│  │  ├─ Message Display Area (Chat History)                                                   │
│  │  ├─ Input Field (User Messages)                                                           │
│  │  ├─ Suggested Actions/Buttons                                                             │
│  │  └─ Language Selector                                                                     │
│  └─ WebSocket Connection (Real-time updates)                                                 │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                          ↓ WebSocket + HTTP/REST
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    API GATEWAY                                               │
│  (Kong, NGINX, or Custom Express Gateway)                                                    │
│  ├─ Route /chat/* → Chat Service                                                             │
│  ├─ Route /events/* → Event Service                                                          │
│  ├─ Route /auth/* → Auth Service                                                             │
│  ├─ Authentication & Authorization Middleware                                                │
│  ├─ Rate Limiting (100 req/min per user)                                                     │
│  ├─ Request Logging & Monitoring                                                             │
│  └─ Load Balancing across services                                                           │
└─────────────────────────┬──────────────────────────────────────────────────┬─────────────────┘
                          │                                                  │
        ┌─────────────────────────────────────────────────┐   ┌─────────────────────────────────┐
        │     SERVICE MESH (Istio/Linkerd optional)      │   │    MESSAGE QUEUE LAYER         │
        │  - Service discovery                            │   │  (RabbitMQ / Kafka)            │
        │  - Load balancing                               │   │  ├─ event.created topic        │
        │  - Circuit breaking                             │   │  ├─ chat.message topic         │
        │  - Distributed tracing                          │   │  └─ notification topic         │
        └─────────────────────────────────────────────────┘   └─────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┬──────────────────┬──────────────────┐
        │                                   │                  │                  │
        ▼                                   ▼                  ▼                  ▼
┌────────────────────┐        ┌────────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   CHAT SERVICE     │        │  INTENT/NLP        │  │  LOCALIZATION    │  │  EVENT SERVICE  │
│   (Port 5001)      │        │  SERVICE           │  │  SERVICE         │  │  (Port 5003)    │
│                    │        │  (Port 5002)       │  │  (Port 5004)     │  │                 │
│ ┌─────────────────┐│        │                    │  │                  │  │ ┌─────────────┐ │
│ │ Chat Controller ││        │ ┌────────────────┐ │  │ ┌──────────────┐ │  │ │Event        │ │
│ │ handleMessage() ││        │ │ Intent Parser  │ │  │ │ Language     │ │  │ │Controller   │ │
│ └────────┬────────┘│        │ └────────────────┘ │  │ │ Detector     │ │  │ │ createEvent()│ │
│          │         │        │ ┌────────────────┐ │  │ ├──────────────┤ │  │ └────────┬────┘ │
│ ┌────────▼────────┐│        │ │ Entity Extractor│ │  │ │ Date Parser  │ │  │ ┌────────▼────┐ │
│ │ConversationFlow ││        │ └────────────────┘ │  │ │ Formatter    │ │  │ │Event        │ │
│ │ Manager         ││        │ ┌────────────────┐ │  │ └──────────────┘ │  │ │Repository   │ │
│ │ - Step tracking ││        │ │ Sentiment Anal. │ │  │ ┌──────────────┐ │  │ │ - CRUD      │ │
│ │ - Context mgmt  ││        │ └────────────────┘ │  │ │ Timezone Mgr │ │  │ │ - Events    │ │
│ └─────────────────┘│        │                    │  │ └──────────────┘ │  │ └─────────────┘ │
│                    │        │ NLP Models         │  │                  │  │                 │
│ Redis Cache        │        │ (TF.js / ONNX)     │  │ Localization DB  │  │ Event DB        │
│ ├─ Sessions        │        │                    │  │ (PostgreSQL)     │  │ (PostgreSQL)    │
│ └─ Context         │        └────────────────────┘  └──────────────────┘  └─────────────────┘
└────────────────────┘
        │
        │ Pub/Sub Events
        │
        ▼
┌─────────────────────────────────────────┐
│   SESSION SERVICE (Port 5005)            │
│  ┌────────────────────────────────────┐  │
│  │ Session Manager                    │  │
│  │ - Create/Get/Update/Delete         │  │
│  │ - TTL Management (24 hours)        │  │
│  │ - Context Persistence              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Session Store (Redis)                   │
│  ├─ User Sessions                        │
│  ├─ Event Drafts                         │
│  └─ Conversation State                   │
└─────────────────────────────────────────┘
        │
        │ Subscribe to events
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│   NOTIFICATION SERVICE (Port 5006) - Optional                │
│  Publish notifications via:                                   │
│  ├─ WebSocket (Real-time in UI)                              │
│  ├─ Email (Async task queue)                                 │
│  ├─ Slack (Webhook integration)                              │
│  └─ In-App Dashboard                                         │
└──────────────────────────────────────────────────────────────┘

         │
         │ Subscribe to events
         │
         ▼
┌────────────────────────────────────────┐
│   AUDIT/LOGGING SERVICE (Port 5007)    │
│  ├─ Event Sourcing                     │
│  ├─ Audit Trail                        │
│  ├─ Performance Metrics                │
│  └─ Error Tracking                     │
└────────────────────────────────────────┘
```

## Service Dependencies & Communication

```
Frontend
  │
  ├─→ [API Gateway]
      │
      ├─→ Chat Service (get_message)
      │   ├─→ Intent Service (classify_intent)
      │   ├─→ Localization Service (get_prompt)
      │   ├─→ Session Service (get/update_session)
      │   └─→ Publish: chat.message_processed
      │
      ├─→ Event Service (create_event)
      │   ├─→ Localization Service (validate_timezone)
      │   └─→ Publish: event.created
      │
      └─→ Auth Service (verify_token)

Message Queue (RabbitMQ/Kafka)
  ├─ event.created → Notification Service, Audit Service
  ├─ chat.message → Audit Service, Analytics Service
  └─ event.updated → Notification Service
```

### Service Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    KUBERNETES CLUSTER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Ingress (API Gateway)                                     │ │
│  │  - External traffic entry point                            │ │
│  │  - SSL/TLS termination                                     │ │
│  └────────────┬─────────────────────────────────────────────┘ │
│               │                                                 │
│  ┌────────────┴──────────────────────────────────────────────┐ │
│  │  Service Mesh Control Plane (optional Istio)              │ │
│  └────────────┬──────────────────────────────────────────────┘ │
│               │                                                 │
│  ┌────────────┴────────────────────────────────────────────┐  │
│  │            POD DEPLOYMENTS                              │  │
│  │  Each service can scale independently (replica sets)    │  │
│  │                                                          │  │
│  │  Chat Service       [Pod] [Pod] [Pod]                  │  │
│  │  Intent Service     [Pod] [Pod] [Pod]                  │  │
│  │  Event Service      [Pod] [Pod] [Pod]                  │  │
│  │  Localization Srv   [Pod] [Pod]                        │  │
│  │  Session Service    [Pod] [Pod] [Pod]                  │  │
│  │  Notification Srv   [Pod] [Pod]                        │  │
│  │  Audit Service      [Pod]                              │  │
│  │                                                          │  │
│  │  Stateless → Easy horizontal scaling ✓                 │  │
│  │  Fault isolation → One service down doesn't break all  │  │
│  │  Independent updates → Deploy Chat Service without     │  │
│  │                       affecting others                   │  │
│  └──────────────────────────────────────────────────────────┘ │
│               │                                                 │
│  ┌────────────┴──────────────────────────────────────────────┐ │
│  │            DATA LAYER (StatefulSets)                      │ │
│  │                                                            │ │
│  │  PostgreSQL Cluster                                      │ │
│  │  ├─ Events DB (Dedicated)                                │ │
│  │  ├─ Chat DB (Dedicated)                                  │ │
│  │  └─ Localization DB (Shared)                             │ │
│  │                                                            │ │
│  │  Redis Cluster (Cache)                                   │ │
│  │  ├─ Sessions (TTL: 24h)                                  │ │
│  │  ├─ Conversation cache                                   │ │
│  │  └─ Rate limiting                                        │ │
│  │                                                            │ │
│  │  RabbitMQ Cluster (Message Queue)                        │ │
│  │  (Or Kafka for higher throughput)                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Horizontal Scaling Example:
  High chat traffic? → kubectl scale deployment chat-service --replicas=10
  High event creation? → kubectl scale deployment event-service --replicas=5
  Need more intent processing? → kubectl scale deployment intent-service --replicas=8
```

## Individual Service Specifications

### 1. Chat Service (Port 5001)
**Responsibility**: Message handling, conversation flow, user interaction
```javascript
Routes:
  POST /chat/message
    - Accept user message
    - Call Intent Service
    - Call Session Service
    - Call Localization Service
    - Publish event: chat.message_received
    - Return formatted response

  GET /chat/session/:sessionId
    - Retrieve session context
    - Return conversation state

  POST /chat/session
    - Create new session
    - Initialize event draft

  DELETE /chat/session/:sessionId
    - Clear session after event creation
```

**Internal Methods**:
```javascript
class ChatService {
  async processMessage(userId, sessionId, message)
  async getSession(sessionId)
  async updateSession(sessionId, updates)
  async validateUserMessage(message)
  async formatResponse(data, language)
}
```

**Dependencies**: 
- Intent Service (REST)
- Session Service (REST)
- Localization Service (REST)
- Message Queue (Publish events)

---

### 2. Intent/NLP Service (Port 5002)
**Responsibility**: Understanding user intent, entity extraction, semantic analysis
```javascript
Routes:
  POST /intent/classify
    - Input: { message, context, language }
    - Output: { intent, entities, confidence, suggested_action }

  POST /intent/extract-date
    - Parse date strings
    - Handle timezone
    - Return ISO datetime

  POST /intent/validate-field
    - Input: { field, value, context }
    - Output: { valid, errors, suggestions }
```

**Intent Types Detected**:
```javascript
{
  CREATE_EVENT: "User wants to start/create event",
  PROVIDE_INPUT: "User provides value for current field",
  CHANGE_FIELD: "User wants to modify existing field",
  SKIP_FIELD: "User wants to skip optional field",
  CONFIRM: "User confirms event creation",
  HELP: "User asks for help",
  CLARIFY: "User needs clarification",
  CANCEL: "User wants to cancel"
}
```

**NLP Models**:
- Sentiment Analysis (Transformers.js)
- Intent Classification (Fine-tuned)
- Named Entity Recognition (Date, Location, Numbers)
- Language Detection (franc library)

---

### 3. Localization Service (Port 5004)
**Responsibility**: Multi-language support, date/timezone handling
```javascript
Routes:
  GET /i18n/messages/:language/:key
    - Return translated message

  GET /i18n/timezones/:language
    - Return localized timezone options

  POST /i18n/parse-date
    - Input: { dateString, timezone, language }
    - Output: { iso_datetime, display_format }

  GET /i18n/languages
    - Return supported languages

  POST /i18n/format-date
    - Input: { datetime, timezone, language }
    - Output: { formatted_string }
```

**Supported Languages**:
```javascript
{
  en: "English (US)",
  es: "Spanish",
  fr: "French"
}

// Extendable for: de, it, pt, ja, zh, etc.
```

**In-Memory Cache Pattern**:
```javascript
// Load all translations at startup (fast)
const languageCache = {
  en: { 'bot.greeting': 'Hi!', ... },
  es: { 'bot.greeting': '¡Hola!', ... },
  fr: { 'bot.greeting': 'Bonjour!', ... }
}

// Refresh cache on schedule (15 min)
setInterval(async () => {
  const fresh = await db.getLocalizations()
  Object.assign(languageCache, fresh)
}, 15 * 60 * 1000)
```

---

### 4. Session Service (Port 5005)
**Responsibility**: Session lifecycle, context persistence, TTL management
```javascript
Routes:
  POST /session/create
    - Initialize session
    - Set TTL (24 hours)

  GET /session/:sessionId
    - Retrieve session with context

  PUT /session/:sessionId
    - Update session state

  DELETE /session/:sessionId
    - Clear session

  POST /session/cleanup
    - Scheduled: Remove expired sessions
    - Triggers: User logout, Event created
```

**Storage Strategy**:
```
Primary: Redis (Fast access, TTL support)
├─ Key: session:{sessionId}
├─ Value: JSONB
│  {
│    userId,
│    language,
│    currentStep,
│    eventDraft,
│    conversationHistory,
│    lastActivity,
│    expiresAt
│  }
└─ TTL: 24 hours

Secondary: PostgreSQL (Audit trail)
├─ Table: chat_sessions_archive
├─ Purpose: Historical records
└─ Retention: 30 days
```

---

### 5. Event Service (Port 5003)
**Responsibility**: Event creation, validation, persistence
```javascript
Routes:
  POST /events
    - Create event from chat
    - Assign to admin
    - Publish: event.created

  GET /events
    - List user's events (role-filtered)

  PUT /events/:eventId
    - Update event

  DELETE /events/:eventId
    - Delete event
    - Publish: event.deleted
```

**Event Creation Flow**:
```javascript
POST /events/from-chat
  {
    sessionId,
    eventDraft,
    confirm: true
  }

Process:
  1. Validate eventDraft completeness
  2. Sanitize all fields
  3. Get user from JWT
  4. Insert into events table
  5. Publish event.created → Queue
  6. Clear session
  7. Return event details
```

---

### 6. Notification Service (Port 5006) - Optional
**Responsibility**: User notifications, webhooks, integrations
```javascript
Consumes:
  - event.created
  - event.updated
  - chat.session_completed

Produces:
  - Notification sent to UI
  - Email notification
  - Slack webhook
  - Audit log entry

Example Flow:
  1. Listen to event.created
  2. Create notification record
  3. Send via WebSocket to UI
  4. Queue email task
  5. Call Slack webhook (if configured)
```

---

### 7. Audit/Logging Service (Port 5007) - Optional
**Responsibility**: Event sourcing, compliance, analytics
```javascript
Event Log:
  {
    id,
    serviceSource,
    eventType: "chat.message_received" | "event.created" | ...,
    userId,
    timestamp,
    data: { ... },
    metadata: { ip, userAgent, ... }
  }

Queries:
  - What did admin X do?
  - When was event Y created?
  - Track conversation history
  - Compliance reports
```

---

## Conversation Flow Diagram

```
User Input
    ↓
Chat Service (5001)
    ├─→ Intent Service (5002) "classify intent"
    ├─→ Session Service (5005) "get context"
    ├─→ Localization Service (5004) "translate"
    ├─→ Event Service (5003) "validate draft"
    └─→ Publish to Queue: "chat.message_received"
    ↓
Response to User
    ├─→ WebSocket (Real-time)
    └─→ Notification Service (5006) → UI update
    ↓
Event Creation (when confirmed)
    └─→ Event Service API
        ├─→ Validate
        ├─→ Create in DB
        ├─→ Publish: "event.created"
        └─→ Clear session

```

---

## Message Queue Event Pattern

**RabbitMQ/Kafka Topics**:

```javascript
Exchanges/Topics:
  
1. events
   - event.created
   - event.updated
   - event.deleted
   
2. chat
   - chat.message_received
   - chat.session_started
   - chat.session_completed
   - chat.intent_classified
   
3. notifications
   - notification.queued
   - notification.sent
   
4. audit
   - audit.log_entry

Example Publisher (Event Service):
  await messageQueue.publish('events', 'event.created', {
    eventId: '123',
    userId: 'user-456',
    createdAt: new Date(),
    data: { ... }
  })

Example Subscriber (Notification Service):
  messageQueue.subscribe('events', 'event.created', async (msg) => {
    const notification = {
      userId: msg.userId,
      title: 'Event Created',
      message: `Your event "${msg.data.title}" is live`,
      createdAt: new Date()
    }
    await notificationRepo.create(notification)
    // Send via WebSocket
    io.to(msg.userId).emit('notification', notification)
  })
```

---

## Data Models for Microservices

### PostgreSQL Schema

```sql
-- Events Table
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  created_by_user_id UUID NOT NULL,
  role_created VARCHAR(50),
  created_via_chat BOOLEAN DEFAULT FALSE,
  chat_session_id UUID,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Chat Sessions Table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  current_step INTEGER DEFAULT 0,
  event_draft JSONB DEFAULT '{}',
  conversation_history JSONB DEFAULT '[]',
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Localization/Language Strings
CREATE TABLE language_strings (
  id UUID PRIMARY KEY,
  language_code VARCHAR(10),
  key VARCHAR(255),
  value TEXT,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(language_code, key)
);

-- Audit Trail
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  service_source VARCHAR(100),
  event_type VARCHAR(100),
  user_id UUID,
  data JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255),
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Redis Schema

```javascript
// Session Storage
session:{sessionId}: JSON
{
  userId: 'user-123',
  language: 'en',
  currentStep: 2,           // Step in conversation flow
  eventDraft: {
    title: '',
    date: '',
    location: '',
    description: ''
  },
  conversationHistory: [
    { role: 'bot', content: 'What event would you like to create?' },
    { role: 'user', content: 'Team meeting' },
    { role: 'bot', content: 'Great! When would you like to schedule it?' }
  ],
  lastActivity: '2024-01-15T10:30:00Z',
  expiresAt: '2024-01-16T10:30:00Z'
}
TTL: 86400 seconds (24 hours)

// Cached Translations
i18n:{language}: JSON
{
  'bot.greeting': 'Hello, how can I help?',
  'bot.ask_event_title': 'What would you like to name this event?',
  'bot.ask_event_date': 'When should this event occur?',
  'bot.confirm_event': 'Perfect! Should I create this event?',
  'event.created_success': 'Event created successfully!'
}
TTL: 900 seconds (15 minutes) - Refresh periodically

// Active User Sessions (for presence)
user:{userId}:active_sessions: SET
{
  session-123,
  session-456,
  session-789
}
TTL: 3600 seconds (1 hour) - Used for multiple device support
```

---

## Service-to-Service Communication

### REST API Contract
```javascript
// All services expose standard REST interface
// Base URL: http://service-name:port

Chat Service Response Format:
{
  success: true,
  data: { ... },
  message: "Operation completed",
  timestamp: "2024-01-15T10:30:00Z"
}

Error Format:
{
  success: false,
  error: {
    code: "INTENT_NOT_FOUND",
    message: "Unable to classify user intent",
    details: { ... }
  },
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Discovery & Load Balancing
```javascript
// Option 1: Kubernetes Service DNS (Recommended for K8s)
// Service automatically routes to healthy pods
http://chat-service:5001
http://intent-service:5002
http://event-service:5003

// Option 2: Service Registry (Consul/Eureka)
serviceRegistry.register('chat-service', {
  host: 'localhost',
  port: 5001,
  healthCheck: '/health'
})

// Option 3: API Gateway
// Routes all requests through centralized gateway
http://api-gateway:3000/chat/...
http://api-gateway:3000/intent/...
```

---

## Deployment & Scaling

### Docker Container per Service
```dockerfile
# Example: Chat Service Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY services/chat/ ./
EXPOSE 5001
CMD ["node", "index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1
```

### Kubernetes Manifest
```yaml
# chat-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chat-service
  namespace: chatbot
spec:
  replicas: 3  # Initial: 3 replicas
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: chat-service
  template:
    metadata:
      labels:
        app: chat-service
    spec:
      containers:
      - name: chat-service
        image: chatbot/chat-service:1.0.0
        ports:
        - containerPort: 5001
        env:
        - name: QUEUE_HOST
          value: rabbitmq-service
        - name: SESSION_REDIS_HOST
          value: redis-service
        - name: DB_HOST
          value: postgres-service
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 5001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5001
          initialDelaySeconds: 10
          periodSeconds: 5

---
# chat-service-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: chat-service
  namespace: chatbot
spec:
  selector:
    app: chat-service
  ports:
  - port: 5001
    targetPort: 5001
  type: ClusterIP  # Internal only

---
# chat-service-hpa.yaml (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chat-service-hpa
  namespace: chatbot
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chat-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

# Scale command to manually test
# kubectl scale deployment chat-service --replicas=10
```

### Database Replication for HA
```sql
-- Primary PostgreSQL (Master)
Primary connects to:
  - Replica 1 (Async)
  - Replica 2 (Async)
  
-- Read operations → Replicas (via load balancer)
-- Write operations → Primary only
-- Connection pooling with PgBouncer

-- Failover strategy: Patroni + etcd
-- Automatic promotion of replica if primary fails
```

---

## Deployment Architecture

### Zones/Regions
```
Load Balancer
    ├─ Region 1 (US-East)
    │  ├─ Chat Service Pod
    │  ├─ Intent Service Pod
    │  └─ Event Service Pod
    │
    ├─ Region 2 (US-West)
    │  ├─ Chat Service Pod
    │  ├─ Intent Service Pod
    │  └─ Event Service Pod
    │
    └─ Region 3 (EU-Central)
       ├─ Chat Service Pod
       ├─ Intent Service Pod
       └─ Event Service Pod

Shared Infrastructure:
  - Primary Database (US-East with WAL shipping)
  - Redis Cluster (Multi-region replication)
  - Message Queue (3-node RabbitMQ cluster)
  - Global CDN for static assets
```

### Failover & Recovery
```javascript
Chat Service Pod Dies:
  → Kubernetes detects pod unhealthy (failed healthcheck)
  → Removes pod from service endpoints
  → HPA may trigger if below min replicas
  → New pod starts automatically
  → Traffic routes to remaining healthy pods
  Time to recovery: ~30 seconds

Database Failover:
  → Patroni detects primary failure
  → Automatically promotes best replica to primary
  → Updates DNS/connection strings
  → Slaves reconnect to new primary
  Time to recovery: ~5-10 seconds
```

---

## Security in Microservices

### Service-to-Service Authentication
```javascript
// Option 1: mTLS (Mutual TLS)
// Istio handles automatically
// Every pod gets cert, validates all connections

// Option 2: JWT Token Exchange
const token = jwt.sign({
  serviceId: 'chat-service',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 3600000
}, INTER_SERVICE_SECRET)

// Called service validates token
const decoded = jwt.verify(token, INTER_SERVICE_SECRET)

// Option 3: API Keys
// Each service has API key for others
// Headers: X-Service-Key: service-key-xyz
```

### Rate Limiting
```javascript
// Per service per IP
Chat Service:
  - 100 requests per minute per user
  - 10,000 requests per minute per service

Intent Service:
  - 1000 requests per minute (high volume)

Event Service:
  - 50 requests per minute per user (write protection)

// Implemented at API Gateway level
```

### Secrets Management
```javascript
// Kubernetes Secrets
kubectl create secret generic db-credentials \
  --from-literal=DB_PASSWORD=secure_pass

// Vault for sensitive data
vault kv put secret/chatbot/db \
  password=secure_pass \
  username=admin

// Environment variables at pod startup
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: DB_PASSWORD
```

---

## Monitoring & Observability

### Prometheus Metrics
```javascript
// Chat Service exposes metrics
GET /metrics

Exported metrics:
  - chat_messages_total{intent="create_event"}
  - chat_response_time_ms (histogram)
  - session_active_count
  - message_queue_lag
  - service_errors_total{type="intent_failed"}

// Scraped by Prometheus
// Visualized in Grafana
```

### Distributed Tracing
```javascript
// Install: OpenTelemetry + Jaeger

Chat Service receives request:
  1. Generate trace ID (or use parent)
  2. Span: chat.processMessage
     ├─ Span: intent.classify (calls Intent Service)
     ├─ Span: localization.translate
     ├─ Span: session.update
     └─ Span: queue.publish
  3. All spans linked with trace ID
  4. View full request flow in Jaeger UI
  5. Identify bottlenecks, failures, slow services
```

### Logging Strategy
```javascript
// Structured logging (JSON format)
{
  timestamp: "2024-01-15T10:30:00.123Z",
  level: "info",
  service: "chat-service",
  instance: "pod-abc-123",
  traceId: "xyz-123-abc",
  spanId: "span-456",
  userId: "user-789",
  action: "processMessage",
  intent: "create_event",
  duration_ms: 245,
  status: "success"
}

// Aggregated by ELK Stack or Loki
// Searchable by traceId, userId, service, etc.
```

---

## This completes the detailed microservices architecture specification.

```
                        START: "I want to create an event"
                                    ↓
                    [Detect User Language: EN/ES/FR]
                                    ↓
                    ┌───────────────────────────────┐
                    │   Initialize Event Session    │
                    │  - Generate Session ID        │
                    │  - Set Language               │
                    │  - Create Empty Event Draft   │
                    └───────────────────────────────┘
                                    ↓
        ┌────────────────────────────────────────────────────────┐
        │             CONVERSATION LOOP (Step-by-Step)           │
        ├────────────────────────────────────────────────────────┤
        │                                                         │
        │  Step 1: COLLECT EVENT NAME                           │
        │  Q: "What would you like to name this event?"         │
        │  A: User input → Validate → Store                     │
        │         ↓                                              │
        │  Step 2: COLLECT SUBHEADING                           │
        │  Q: "Provide a catchy subheading"                    │
        │  A: User input → Validate → Store                     │
        │         ↓                                              │
        │  Step 3: COLLECT DESCRIPTION                          │
        │  Q: "Describe the event in detail"                    │
        │  A: User input → Validate → Store                     │
        │         ↓                                              │
        │  Step 4: COLLECT BANNER URL                           │
        │  Q: "Upload or paste banner image URL"                │
        │  Suggestions: [Upload] [Paste URL] [Use Template]    │
        │  A: User input → Validate URL → Store                 │
        │         ↓                                              │
        │  Step 5: SELECT TIMEZONE                              │
        │  Q: "Select event timezone"                           │
        │  Buttons: [UTC] [EST] [CST] [PST] [More...]          │
        │  A: User selection → Store                            │
        │         ↓                                              │
        │  Step 6: SELECT STATUS                                │
        │  Q: "Set event status"                                │
        │  Buttons: [Draft] [Published] [Pending]              │
        │  A: User selection → Store                            │
        │         ↓                                              │
        │  Step 7: COLLECT START DATE/TIME                      │
        │  Q: "When should the event start? (e.g., tomorrow 2pm, next Monday 10am)" │
        │  A: Parse flexible date → Validate → Store            │
        │         ↓                                              │
        │  Step 8: COLLECT END DATE/TIME                        │
        │  Q: "When should it end?"                             │
        │  A: Parse flexible date → Validate → Store            │
        │         ↓                                              │
        │  Step 9: COLLECT VANISH DATE/TIME                     │
        │  Q: "When should event disappear? (optional)"         │
        │  A: Parse flexible date → Validate → Store            │
        │         ↓                                              │
        │  Step 10: SELECT ROLES (Multi-select)                 │
        │  Q: "Who can access this event?"                      │
        │  Buttons: [Admin] [Manager] [Sales Rep] [Viewer]    │
        │  A: User selections → Store                           │
        │         ↓                                              │
        │  Step 11: CONFIRM DETAILS                             │
        │  Display Summary → "Ready to create? [Yes] [No]"    │
        │  A: User confirmation                                 │
        │                                                         │
        └────────────────────────────────────────────────────────┘
                                    ↓
                    ┌───────────────────────────────┐
                    │  Create Event in Database     │
                    │  - Validate All Fields        │
                    │  - Set created_by = admin_id  │
                    │  - Set created_via_chat=true  │
                    │  - Return Event ID            │
                    └───────────────────────────────┘
                                    ↓
                    ┌───────────────────────────────┐
                    │   Display Success Message     │
                    │   Show Event in Card Format   │
                    │   [View Events] [Create More] │
                    └───────────────────────────────┘
                                    ↓
                    ┌───────────────────────────────┐
                    │  Clear Session & Chat History │
                    │  Ready for Next Conversation  │
                    └───────────────────────────────┘
```

## Data Flow

### User Input Processing Pipeline
```
User Message
    ↓
[Language Detection]
    ↓ (Default: English or detected language)
[Intent Classification]
    ├─ CREATE_EVENT
    ├─ CHANGE_FIELD
    ├─ CONFIRM_DETAILS
    ├─ ADD_MORE_ROLES
    └─ HELP
    ↓
[Context Retrieval]
    ├─ Get current conversation step
    ├─ Get event draft data
    └─ Get conversation history
    ↓
[Input Validation]
    ├─ Field-specific validation
    ├─ Format conversion (dates, URLs)
    └─ Error handling with suggestions
    ↓
[State Update]
    ├─ Update event draft
    ├─ Advance conversation step
    └─ Save context to session
    ↓
[Response Generation]
    ├─ Generate next question
    ├─ Provide suggestions/buttons
    └─ Translate to user language
    ↓
Frontend Display
```

## State Management Structure

```javascript
// ChatSession State
{
  sessionId: "uuid",
  userId: "user-id",
  language: "en", // or "es", "fr"
  conversationStep: "NAME", // NAME → SUBHEADING → DESCRIPTION → BANNER → TIMEZONE → STATUS → START_DATE → END_DATE → VANISH_DATE → ROLES → CONFIRM
  eventDraft: {
    name: null,
    subheading: null,
    description: null,
    banner_url: null,
    timezone: null,
    status: null,
    start_time: null,
    end_time: null,
    vanish_time: null,
    roles: [] // [Admin, Manager, Sales Rep, Viewer]
  },
  conversationHistory: [
    { role: "bot", message: "...", timestamp, language },
    { role: "user", message: "...", timestamp, language }
  ],
  validationErrors: {},
  suggestions: [],
  expiresAt: timestamp
}
```

## Key Features

### 1. Language Auto-Detection
- Detect from first message
- Support: English (en), Spanish (es), French (fr)
- Store language preference in session
- All subsequent responses in same language

### 2. Flexible Date Parsing
- Natural language: "tomorrow 2pm", "next Monday 10:30am"
- Relative dates: "in 3 days", "2 weeks from now"
- Absolute dates: "2026-04-15 14:30", "April 15, 2026"
- Parse in timezone context

### 3. Conversation Context
- Maintain full conversation history
- Allow corrections: "change description to..."
- Support interruptions: "skip timezone for now"
- Session expiration (24 hours)

### 4. Input Validation
- Field-specific rules
- Error messages in user language
- Suggestions for corrections
- Allow retries

### 5. Multi-Select Support
- Select multiple roles
- Visual confirmation
- Easy modification: "add Manager", "remove Viewer"

## Database Schema Extensions

### chat_sessions Table
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  conversation_data JSONB NOT NULL, -- Full chat history
  current_language VARCHAR(10) DEFAULT 'en',
  event_draft JSONB, -- Partial event being created
  conversation_step VARCHAR(50), -- NAME, SUBHEADING, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  CONSTRAINT expires_after_updated CHECK (expires_at > updated_at)
);
```

### Update events Table
```sql
ALTER TABLE events ADD COLUMN created_via_chat BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN roles TEXT[] DEFAULT ARRAY['Admin'];
```

### language_strings Table
```sql
CREATE TABLE language_strings (
  id SERIAL PRIMARY KEY,
  language_code VARCHAR(10) NOT NULL, -- en, es, fr
  string_key VARCHAR(255) NOT NULL, -- bot.greeting, bot.ask_event_name
  translation TEXT NOT NULL,
  UNIQUE(language_code, string_key)
);
```

## API Contracts

### Request: POST /api/chat/message
```json
{
  "sessionId": "uuid or null (for new session)",
  "message": "I want to create an event",
  "language": "en or auto-detect"
}
```

### Response
```json
{
  "success": true,
  "sessionId": "uuid",
  "step": "NAME",
  "botMessage": "What would you like to name this event?",
  "suggestions": [],
  "eventDraft": { ...current state },
  "conversationHistory": [...],
  "timezone": null,
  "isComplete": false,
  "error": null
}
```

### Request: POST /api/events/from-chat
```json
{
  "sessionId": "uuid",
  "eventDraft": { ...full event data },
  "confirm": true
}
```

### Response
```json
{
  "success": true,
  "eventId": "123",
  "event": { ...created event },
  "message": "Event created successfully!",
  "sessionCleared": true
}
```

## Security & Best Practices

1. **Authentication**: All endpoints require valid JWT token with admin role
2. **Session Validation**: Verify session belongs to authenticated user
3. **Rate Limiting**: Limit messages per minute to prevent spam
4. **Input Sanitization**: Sanitize all user inputs before storage
5. **SQL Injection Prevention**: Use parameterized queries
6. **CSRF Protection**: Include endpoint protection
7. **Session Expiration**: Auto-expire sessions after 24 hours
8. **Audit Logging**: Log all events created via chat
