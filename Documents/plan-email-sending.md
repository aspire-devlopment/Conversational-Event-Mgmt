# Email Sending Implementation Plan

**Version:** 1.0  
**Created:** 2026-05-06  
**Author:** Season Banjade  
**Status:** Draft

---

## 1. Executive Summary

This document outlines the technical implementation plan for a scalable, production-ready email notification system integrated with the event management platform. The system will send personalized emails to users assigned to events via role-based or direct assignment.

## 2. Objectives

1. Send event notifications to assigned users
2. Support multiple email providers (SendGrid, AWS SES, SMTP)
3. Queue-based async delivery for scalability
4. Retry logic with exponential backoff
5. Delivery tracking and failure monitoring

## 3. Architecture Design

### 3.1 High-Level Flow

```
Event Created/Updated
        ↓
Notification Service Triggered
        ↓
Get Recipients (by role/direct)
        ↓
Queue Email Jobs (BullMQ)
        ↓
Background Worker Processes
        ↓
Email Provider Sends
        ↓
Update Delivery Status
```

### 3.2 Components

| Component | Responsibility |
|-----------|---------------|
| NotificationService | Get recipients, queue jobs |
| EmailProvider | Abstract email delivery |
| NotificationWorker | Process queue jobs |
| Event Hooks | Emit events on create/update |
| Database Tables | Track sent/failed status |

## 4. Database Schema

```sql
CREATE TABLE event_notifications (
    id BIGSERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notif_event_id ON event_notifications(event_id);
CREATE INDEX idx_notif_status ON event_notifications(status);
```

## 5. Implementation Phases

### Phase 1: Core Notification Service (Week 1)

**Files to create:**
- `backend/services/notificationService.js`
- `backend/services/emailProvider.js`
- `backend/utils/eventHooks.js`

**Key functions:**
```javascript
// notificationService.js
async getEventRecipients(eventId)  // Get users by role assignment
async recordNotification(eventId, userId, email, type)
async notifyEventCreated(event)   // Main entry point
```

### Phase 2: Queue Integration (Week 1)

**Files to create:**
- `backend/queues/notificationQueue.js`
- `backend/workers/notificationWorker.js`

**Configuration:**
```bash
# .env additions
REDIS_HOST=localhost
REDIS_PORT=6379
QUEUE_CONCURRENCY=5
MAX_ATTEMPTS=3
```

### Phase 3: Email Providers (Week 2)

**Files to create:**
- `backend/services/providers/sendgridProvider.js`
- `backend/services/providers/sesProvider.js`
- `backend/services/providers/smtpProvider.js`

**Pattern:**
```javascript
class BaseProvider {
  async send({ to, subject, template, data }) {
    throw new Error('Not implemented');
  }
}
```

### Phase 4: Integration & Testing (Week 2)

**Integration points:**
- `backend/controllers/chatController.js` - after event creation
- `backend/controllers/eventController.js` - after event update

**Test scenarios:**
- Single recipient notification
- Multiple recipient notification
- Failed delivery retry
- Provider fallback

## 6. Environment Variables

```bash
# Email Provider
EMAIL_PROVIDER=sendgrid  # sendgrid|ses|smtp
SENDGRID_API_KEY=sg.xxx
EMAIL_FROM=noreply@company.com

# Queue
REDIS_HOST=localhost
REDIS_PORT=6379

# Settings
NOTIFICATION_ENABLED=true
NOTIFY_ON_CREATE=true
NOTIFY_ON_UPDATE=true
```

## 7. Monitoring & Observability

### 7.1 Metrics to Track
- Notification success rate
- Average delivery time
- Retry count per notification
- Provider failure rate

### 7.2 Logging Structure
```javascript
logger.info('notification', 'Email queued', {
  eventId,
  recipientCount,
  provider: EMAIL_PROVIDER
});
logger.error('notification', 'Delivery failed', {
  notificationId,
  error: err.message
});
```

## 8. Rollout Plan

### Week 1: Development
- Create notification service and providers
- Implement queue system
- Unit tests for all components

### Week 2: Integration & Testing
- Integrate with event creation flow
- Load testing with 100+ recipients
- Monitor delivery rates

## 9. Success Criteria

- [ ] 99% delivery success rate within 5 minutes
- [ ] <1 second queue add latency
- [ ] Retry handles transient failures
- [ ] Failed deliveries logged with error details

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Provider downtime | Multiple provider fallback |
| Queue overflow | Dead letter queue, alert on >1000 pending |
| Invalid email | Validate on user creation, skip invalid |