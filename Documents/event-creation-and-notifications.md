# Event Creation Flow & Email Notification Guide

## 1. How Event Creation Gets Triggered

There are **two ways** events are created in this system:

### 1.1 Chat Assistant Trigger (Primary Method)

**File:** `backend/controllers/chatController.js:301-453`

**Trigger Flow:**
```
User Message
    ↓
AI processes via openaiService.processMessage()
    ↓
LLM Response: { intent: 'confirm', nextStep: 'confirm', extractedData: {...} }
    ↓
isConfirmationMessage(userMessage) returns TRUE
    ↓
validation.valid is TRUE
    ↓
LINE 433: eventRepository.createWithRoles({...}) ← EVENT CREATED
```

**Key code (chatController.js:304, 314):**
```javascript
const userApprovedCommit = looksReadyToCommit && isConfirmationMessage(message);
// ...
if (wantsCreation && validation.valid) {
  const newEvent = await eventRepository.createWithRoles({...});
}
```

**What triggers the save:**
1. All required fields are collected (draft is complete)
2. AI sets intent to 'confirm'
3. User says "yes", "save", "confirm", "ok", "done", etc.
4. `isConfirmationMessage()` returns true

### 1.2 Direct API Trigger

**File:** `backend/controllers/eventController.js:89-114`
**Route:** `POST /api/events`

Simple HTTP POST - triggered immediately when request is received (no confirmation step).

## 2. Where Draft Data is Stored During Chat

### 2.1 Database Storage

**File:** `backend/Database.sql:98-111`

```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY,
    user_id INT,
    session_data JSONB NOT NULL,  -- ← Draft stored here
    current_step VARCHAR(100),
    language VARCHAR(10),
    expires_at TIMESTAMP NOT NULL,
    ...
);
```

The draft is stored in `session_data` as JSONB column:
```json
{
  "event_draft": {
    "name": "Tech Conference",
    "subheading": "...",
    "description": "...",
    "roles": ["Admin", "Manager"],
    ...
  }
}
```

### 2.2 Repository Operations

**File:** `backend/repositories/chatSessionRepository.js`

- `create()` - Lines 85-128: Creates session with empty draft in `session_data` JSONB
- `update()` - Lines 131-168: Updates `session_data` column with new draft state
- `addMessage()` - Lines 171-196: Appends to conversation history in same JSONB

**Key code (lines 85-128):**
```javascript
const sessionData = {
  id: sessionId,
  user_id: payload.user_id,
  conversation_history: [],
  event_draft: payload.event_draft || createEmptyDraft(payload.language || 'en'),  // ← Draft lives here
  ...
};
// Stored in chat_sessions.session_data as JSONB
```

## 3. Where Validation Happens

### 3.1 Backend Validation (Authoritative)

**File:** `backend/services/chatEventUtils.js:489-512`

```javascript
function validateEventData(eventData) {
  const draft = normalizeDraft(eventData, eventData.language);
  const missingFields = getMissingFields(draft);
  const errors = [];
  
  // Date ordering validation
  if (start && end && start >= end) errors.push('endTime must be after startTime');
  // URL format validation  
  if (draft.bannerUrl && !/^https?:\/\/\S+$/i.test(draft.bannerUrl)) errors.push('bannerUrl must be a valid URL');
  // Role validation
  if (invalidRoles.length > 0) {
    errors.push(`roles contains invalid values: ${invalidRoles.join(', ')}`);
  }
  ...
  return { valid: missingFields.length === 0 && errors.length === 0, ... };
}
```

### 3.2 When Validation Runs

**File:** `backend/controllers/chatController.js:301`

```javascript
const validation = openaiService.validateEventData(eventDraft);  // ← Backend validation
// ...
if ((sessionData.mode === 'update' ? wantsUpdateCommit : wantsCreation) && validation.valid) {
  // Only saves if backend validation passes
}
```

**Validation happens:**
1. After each message is processed (line 301)
2. Before event is committed to database (line 314 condition)
3. Uses deterministic rules NOT AI output

---

## 4. Event Creation Pipeline

### 4.1 HTTP Request Entry (Direct API)
**File:** `backend/routes/eventRoutes.js`
- Route: `POST /api/events`
- Middleware: JWT verification → Idempotency check → Payload validation → Duplicate detection
- Handler: `eventController.createEvent()`

### 4.2 Controller Processing
**File:** `backend/controllers/eventController.js:89-114`
...
### 4.3 Repository Transaction
**File:** `backend/repositories/eventRepository.js:74-106`

The `createWithRoles` method executes in a single transaction:
1. Insert event row → returns `event_id`
2. Sync roles via `syncEventRoles()` → inserts into `event_roles` table

```javascript
async createWithRoles(payload, roleNames = []) {
  return this.dataContext.withTransaction(async (tx) => {
    // Step 1: Insert event
    const rows = await tx.query(`INSERT INTO events (...) VALUES (...)`, [...]);
    const eventId = rows[0]?.id;

    // Step 2: Assign roles
    await this.syncEventRoles(tx, eventId, roleNames);

    // Return complete event with roles
    return this.getByIdWithContext(tx, eventId);
  });
}
```

### 4.4 Database Persistence
**File:** `backend/Database.sql`

Tables involved:
- `events` - Main event data
- `event_roles` - M:N relationship between events and roles
- `users` - User accounts with role assignments

### 4.5 Update Flow

Similar to create, but uses `updateWithRoles()` (lines 147-193):
1. Update event fields
2. If `roles` provided, delete existing and insert new role mappings
3. Return updated event with roles

---

## 5. Email Notification Implementation

### 5.1 Design Approach

A scalable, professional implementation requires:

| Component | Purpose |
|-----------|---------|
| Event Emitter | Decouple notification logic from core flow |
| Queue System | Handle email delivery asynchronously |
| Template Engine | Support multiple languages |
| Retry Logic | Handle delivery failures |
| Rate Limiting | Prevent abuse |

### 5.2 Database Schema Addition

Add this table for notification tracking:

```sql
-- Notifications table for tracking sent emails
CREATE TABLE event_notifications (
    id BIGSERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE INDEX idx_notif_event_id ON event_notifications(event_id);
CREATE INDEX idx_notif_status ON event_notifications(status);
CREATE INDEX idx_notif_created_at ON event_notifications(created_at DESC);
```

### 5.3 Implementation Files

#### 5.3.1 Notification Service
**File:** `backend/services/notificationService.js`

```javascript
class NotificationService {
  constructor(dataContext, emailProvider) {
    this.dataContext = dataContext;
    this.emailProvider = emailProvider;
  }

  // Get all users with roles assigned to this event
  async getEventRecipients(eventId) {
    const query = `
      SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, r.name as role_name
      FROM event_roles er
      JOIN users u ON u.role_id = er.role_id
      JOIN roles r ON r.id = er.role_id
      WHERE er.event_id = $1 AND u.email IS NOT NULL
    `;
    return this.dataContext.query(query, [eventId]);
  }

  // Record notification in database
  async recordNotification(eventId, userId, roleId, email, type) {
    const result = await this.dataContext.query(
      `INSERT INTO event_notifications (event_id, user_id, role_id, email, notification_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [eventId, userId, roleId, email, type]
    );
    return result[0].id;
  }

  // Send notification to all recipients
  async notifyEventCreated(event) {
    const recipients = await this.getEventRecipients(event.id);
    const results = [];

    for (const recipient of recipients) {
      try {
        const notificationId = await this.recordNotification(
          event.id, recipient.id, recipient.role_id, recipient.email, 'event_created'
        );

        await this.emailProvider.send({
          to: recipient.email,
          subject: `New Event: ${event.name}`,
          template: 'event-created',
          data: {
            eventName: event.name,
            eventDescription: event.description,
            startTime: event.start_time,
            recipientName: `${recipient.first_name} ${recipient.last_name}`,
          }
        });

        await this.dataContext.execute(
          `UPDATE event_notifications SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [notificationId]
        );
        results.push({ email: recipient.email, status: 'sent' });
      } catch (error) {
        await this.dataContext.execute(
          `UPDATE event_notifications SET status = 'failed', error_message = $1 WHERE id = $2`,
          [error.message, notificationId]
        );
        results.push({ email: recipient.email, status: 'failed', error: error.message });
      }
    }
    return results;
  }
}

module.exports = NotificationService;
```

#### 5.3.2 Email Provider Adapter
**File:** `backend/services/emailProvider.js`

```javascript
// Supports multiple providers via adapter pattern
class EmailProvider {
  constructor(config) {
    this.provider = config.provider; // 'ses', 'sendgrid', 'smtp'
    this.apiKey = config.apiKey;
    this.from = config.from;
  }

  async send({ to, subject, template, data }) {
    switch (this.provider) {
      case 'sendgrid':
        return this.sendViaSendGrid(to, subject, template, data);
      case 'ses':
        return this.sendViaSES(to, subject, template, data);
      case 'smtp':
        return this.sendViaSMTP(to, subject, template, data);
      default:
        throw new Error(`Unknown email provider: ${this.provider}`);
    }
  }

  async sendViaSendGrid(to, subject, template, data) {
    const msg = {
      to,
      from: this.from,
      subject,
      templateId: process.env.SENDGRID_TEMPLATES[template],
      dynamicTemplateData: data
    };
    // SendGrid API call here
    return await sgMail.send(msg);
  }
}

module.exports = EmailProvider;
```

#### 5.3.3 Event Hooks
**File:** `backend/utils/eventHooks.js`

```javascript
// Hook into event creation/update for notifications
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();

function emitEventCreated(event) {
  eventEmitter.emit('event:created', event);
}

function emitEventUpdated(event) {
  eventEmitter.emit('event:updated', event);
}

function onEventCreated(handler) {
  eventEmitter.on('event:created', handler);
}

function onEventUpdated(handler) {
  eventEmitter.on('event:updated', handler);
}

module.exports = {
  emitEventCreated,
  emitEventUpdated,
  onEventCreated,
  onEventUpdated
};
```

#### 5.3.4 Integration in Controller
**File:** `backend/controllers/eventController.js` (modified)

```javascript
// Add to createEvent after successful save:
const { emitEventCreated } = require('../utils/eventHooks');

createEvent: async (req, res, next) => {
  try {
    // ... existing validation ...
    const hydratedEvent = await eventRepository.createWithRoles(payload, payload.roles);

    // Emit event for notification service
    emitEventCreated(hydratedEvent);

    return res.status(HTTP_STATUS.CREATED).json(responseBody);
  } catch (error) {
    return next(error);
  }
},
```

#### 5.3.5 Event Subscriber (Background Worker)
**File:** `backend/workers/notificationWorker.js`

```javascript
const { onEventCreated, onEventUpdated } = require('../utils/eventHooks');
const NotificationService = require('../services/notificationService');
const EmailProvider = require('../services/emailProvider');

// Initialize services
const emailProvider = new EmailProvider({
  provider: process.env.EMAIL_PROVIDER,
  apiKey: process.env.EMAIL_API_KEY,
  from: process.env.EMAIL_FROM
});

const notificationService = new NotificationService(dataContext, emailProvider);

// Subscribe to events
onEventCreated(async (event) => {
  console.log(`Triggering notifications for event ${event.id}`);
  try {
    const results = await notificationService.notifyEventCreated(event);
    console.log(`Notifications sent: ${results.filter(r => r.status === 'sent').length}`);
  } catch (error) {
    console.error('Notification error:', error);
  }
});

onEventUpdated(async (event) => {
  // Similar handling for updates
  await notificationService.notifyEventUpdated(event);
});
```

### 5.4 Queue-Based Implementation (Production)

For high-volume systems, use a message queue:

**File:** `backend/queues/emailQueue.js`

```javascript
const Queue = require('bull');

const emailQueue = new Queue('email notifications', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
});

// Process emails in background
emailQueue.process(async (job) => {
  const { event, recipients } = job.data;
  // Send emails...
});

// Add to queue from notification service
async function queueEventNotifications(event) {
  const recipients = await getEventRecipients(event.id);
  await emailQueue.add('send-event-notifications', { event, recipients }, {
    attempts: 3,
    backoff: 'exponential'
  });
}
```

### 5.5 Email Templates

**File:** `backend/templates/emails/event-created.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>New Event: {{eventName}}</title>
</head>
<body>
  <h2>Hello {{recipientName}},</h2>
  <p>A new event has been assigned to your role:</p>
  <h3>{{eventName}}</h3>
  <p>{{eventDescription}}</p>
  <p><strong>Date:</strong> {{startTime}}</p>
  <p>You have been notified because your role ({{roleName}}) is assigned to this event.</p>
</body>
</html>
```

---

## 7. How Roles Map to Users for Notifications

### Current Schema Relationship

```
events ────< event_roles >──── roles ────< users (via role_id)
```

**Query to find all users for an event:**

```sql
SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, r.name as role_name
FROM event_roles er
JOIN roles r ON r.id = er.role_id
JOIN users u ON u.role_id = r.id  -- Users with the same role
WHERE er.event_id = $1;
```

### Alternative: Direct User Assignment (Recommended)

For more precise control, add a direct assignment table:

```sql
CREATE TABLE event_user_assignments (
    event_id INT,
    user_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Then query becomes:
```sql
SELECT u.id, u.email, u.first_name, u.last_name
FROM event_user_assignments ea
JOIN users u ON u.id = ea.user_id
WHERE ea.event_id = $1;
```

---

## 8. Environment Variables Required

```bash
# Email Provider
EMAIL_PROVIDER=sendgrid  # or 'ses', 'smtp'
SENDGRID_API_KEY=sg.xxx
EMAIL_FROM=noreply@yourdomain.com

# Redis for Queue (production)
REDIS_HOST=localhost
REDIS_PORT=6379

# Notification Settings
NOTIFICATIONS_ENABLED=true
NOTIFY_ON_CREATE=true
NOTIFY_ON_UPDATE=true
```

---

## 10. Queue-Based Background Processing Implementation

### 10.1 Architecture Overview

```
Event Created → Emit Event → Queue.add() → Background Worker → Email Service
     ↓                                  ↑
  HTTP Response Returned            Redis/BullMQ
```

### 10.2 Installation

```bash
npm install bullmq ioredis @sendgrid/mail
```

### 10.3 Redis Connection (backend/config/redis.js)
```javascript
const IORedis = require('ioredis');
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});
module.exports = { connection };
```

### 10.4 Notification Queue (backend/queues/notificationQueue.js)
```javascript
const { Queue } = require('bullmq');
const { connection } = require('../config/redis');

const notificationQueue = new Queue('notifications', { connection });

async function queueEventNotifications(event) {
  await notificationQueue.add('sendEventCreated', {
    eventId: event.id,
    eventName: event.name,
    eventData: event
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
}

module.exports = { notificationQueue, queueEventNotifications };
```

### 10.5 Email Provider (backend/services/emailProvider.js)
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailProvider {
  async send({ to, subject, template, data }) {
    const msg = {
      to,
      from: process.env.EMAIL_FROM,
      templateId: process.env.SENDGRID_TEMPLATES[template],
      dynamicTemplateData: data
    };
    return await sgMail.send(msg);
  }
}
module.exports = EmailProvider;
```

### 10.6 Worker Process (backend/workers/notificationWorker.js)
```javascript
const { Worker } = require('bullmq');
const { connection } = require('../config/redis');
const NotificationService = require('../services/notificationService');
const EmailProvider = require('../services/emailProvider');
const { dataContext } = require('../data/dataContexts/postgresDataContext');

const emailProvider = new EmailProvider();
const notificationService = new NotificationService(dataContext, emailProvider);

new Worker('notifications', async (job) => {
  const { eventId, eventData } = job.data;
  
  switch (job.name) {
    case 'sendEventCreated':
      await notificationService.notifyEventCreated(eventData);
      break;
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}, { connection, concurrency: 5 });
```

### 10.7 Integration in Chat Controller (backend/controllers/chatController.js)
```javascript
// After line 452 (event created successfully)
const { queueEventNotifications } = require('../queues/notificationQueue');

// Inside create flow after newEvent is created:
eventCreated = true;
createdEventId = newEvent.id;

// Enqueue notification (fire and forget)
queueEventNotifications(newEvent).catch(err => 
  console.error('Failed to queue notifications:', err)
);
```

### 10.8 Running the Worker

```bash
# Start worker
node backend/workers/notificationWorker.js

# Or with PM2 for production
pm2 start backend/workers/notificationWorker.js --name notifications
```

### 10.9 AWS SQS Alternative (backend/services/sqsService.js)
```javascript
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const sqs = new SQSClient({ region: process.env.AWS_REGION });

async function enqueueSQS(eventData) {
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.SQS_NOTIFICATION_URL,
    MessageBody: JSON.stringify({ eventData })
  }));
}
```

---

## 11. Production Deployment Checklist

- [ ] Redis server running
- [ ] Set `SENDGRID_API_KEY` and `EMAIL_FROM` env vars
- [ ] Start worker process with PM2/Kubernetes
- [ ] Configure queue monitoring (BullMQ UI)
- [ ] Set up retry/DLQ for failed notifications
- [ ] Test with `NOTIFY_ON_CREATE=true`

---

## 12. Calendar Integration (Google/Microsoft)

### 12.1 Architecture

```
Event Created → Notification Queue → Email + Calendar Invite
                    ↓
              Generate iCal file → Attach to email
              OR
              Send via Google/Microsoft Calendar API
```

### 12.2 iCal Attachment Approach (Simplest)

**backend/services/calendarService.js**
```javascript
const ical = require('ical-generator');

function generateICalInvite(event, recipient) {
  return ical({ name: 'Event Invitation' }).createEvent({
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    summary: event.name,
    description: event.description,
    location: event.location || 'Virtual',
    url: `https://yourapp.com/events/${event.id}`,
    status: 'CONFIRMED',
    organizer: { name: 'Event Manager', email: process.env.EMAIL_FROM },
    attendees: [{ name: recipient.first_name, email: recipient.email }]
  });
}

module.exports = { generateICalInvite };
```

**Integrate in emailProvider.js:**
```javascript
const { generateICalInvite } = require('./calendarService');

async send({ to, subject, template, data, event, recipient }) {
  const icalInvite = event ? generateICalInvite(event, recipient) : null;
  
  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject,
    templateId: process.env.SENDGRID_TEMPLATES[template],
    dynamicTemplateData: data,
    attachments: icalInvite ? [{
      content: icalInvite,
      filename: 'invite.ics',
      type: 'text/calendar'
    }] : []
  };
  return await sgMail.send(msg);
}
```

### 12.3 Google Calendar API Integration

**Installation:**
```bash
npm install googleapis
```

**backend/services/googleCalendarService.js**
```javascript
const { google } = require('googleapis');
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function createCalendarEvent(event, accessToken) {
  oAuth2Client.setCredentials({ access_token: accessToken });
  
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  
  return await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: event.name,
      description: event.description,
      start: { dateTime: event.startTime },
      end: { dateTime: event.endTime },
      attendees: [{ email: event.attendeeEmail }] // For each recipient
    }
  });
}
```

### 12.4 Microsoft Graph API Integration

**Installation:**
```bash
npm install @microsoft/microsoft-graph-client isomorphic-fetch
```

**backend/services/outlookCalendarService.js**
```javascript
const { Client } = require('@microsoft/microsoft-graph-client');

async function createOutlookEvent(event, accessToken) {
  const client = Client.init({
    authProvider: (done) => done(null, accessToken)
  });
  
  return await client.api('/me/events').post({
    subject: event.name,
    body: { contentType: 'HTML', content: event.description },
    start: { dateTime: event.startTime, timeZone: event.timezone },
    end: { dateTime: event.endTime, timeZone: event.timezone },
    attendees: [{ emailAddress: { address: event.attendeeEmail } }]
  });
}
```

### 12.5 Integration in Worker

```javascript
// backend/workers/notificationWorker.js
const { generateICalInvite } = require('../services/calendarService');

// After sending email:
if (process.env.ATTACH_ICAL === 'true') {
  const icalContent = generateICalInvite(eventData, recipient);
  await emailProvider.send({
    ...emailOptions,
    attachments: [{
      content: icalContent,
      filename: 'event-invite.ics',
      type: 'text/calendar'
    }]
  });
}
```

### 12.6 Environment Variables for Calendar

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=https://yourapp.com/auth/google/callback

# Microsoft OAuth  
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-secret

# iCal attachment option
ATTACH_ICAL=true
```