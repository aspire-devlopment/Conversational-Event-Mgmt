# Email Notification Implementation Plan
## Sending Email Notifications to Role Users After Event Creation

**Date:** May 6, 2026  
**Status:** Planning Phase  
**Objective:** Implement automated email notifications to notify users of their respective roles when an event is created

---

## 1. Executive Summary

This document outlines the strategy to implement email notifications that will be sent to all users who have a role assigned to a newly created event. For example, if an event is created for "Admin" and "Manager" roles, all users with Admin or Manager roles will receive an email notification about the new event.

---

## 2. Current System State

### 2.1 Database Architecture
- **users table**: Contains `email`, `role_id` columns
- **roles table**: Contains role names (Admin, Manager, Sales Rep, Viewer)
- **events table**: Contains event details with `created_by` field
- **event_roles table**: Many-to-many junction table linking events to roles

### 2.2 Event Creation Flow
**Two entry points:**
1. **Direct API** (`POST /api/events`) via `eventController.js:createEvent()`
2. **Chat Assistant** via `chatController.js` with user confirmation

**Current Process:**
```
Event Creation Request
    ↓
eventRepository.createWithRoles(payload, roleNames)
    ↓
Event saved with role mappings
    ↓
[NO NOTIFICATION SENT - THIS IS THE GAP]
```

### 2.3 Backend Architecture
- **Services**: `authService`, `eventService`, `openaiService`, `loggingService` exist
- **Repositories**: Event, Role, User, EventRole repositories already in place
- **Database**: PostgreSQL with connection pooling
- **Dependencies**: No email library installed yet

---

## 3. Solution Architecture

### 3.1 High-Level Flow
```
Event Created Successfully
    ↓
Get Event Roles (from event_roles join)
    ↓
Get All Users for Those Roles
    ↓
Send Email to Each User
    ↓
Log Notification Status
```

### 3.2 Component Breakdown

#### 3.2.1 Email Service (New)
**File:** `backend/services/emailService.js`

**Responsibilities:**
- Configure SMTP/Email Provider settings
- Send individual emails
- Handle retry logic
- Log email delivery status
- Support HTML templates

**Methods:**
```javascript
- sendEmail(recipient, subject, htmlContent, textContent)
- sendEventNotification(userEmail, eventDetails)
- getEventNotificationTemplate(event, userRole)
- verifyEmailConfiguration()
```

#### 3.2.2 Notification Service (New)
**File:** `backend/services/notificationService.js`

**Responsibilities:**
- Get event roles
- Get users for those roles
- Format event data for email
- Orchestrate email sending
- Handle errors gracefully

**Methods:**
```javascript
- notifyRoleUsersOfEvent(event, eventRoles)
- getUsersByRoles(roleIds)
- buildEventNotificationPayload(event, eventRoles, user)
- handleNotificationFailures(failures)
```

#### 3.2.3 Repository Enhancement
**File:** `backend/repositories/userRepository.js`

**New Methods:**
```javascript
- getUsersByRoleIds(roleIds)  // Get all users for specified roles
- getUsersByRole(roleName)    // Get all users for a specific role
```

#### 3.2.4 Controller Updates
**File:** `backend/controllers/eventController.js`

**Changes:**
- Import `notificationService`
- Call `notifyRoleUsersOfEvent()` after successful event creation
- Handle notification errors without failing event creation
- Log notification results

**File:** `backend/controllers/chatController.js`

**Changes:**
- Trigger notification after event confirmation
- Pass event object to notification service

---

## 4. Implementation Roadmap

### Phase 1: Setup Infrastructure (Priority: HIGH)
**Task 1.1:** Add Email Dependencies
- Install nodemailer: `npm install nodemailer`
- Install dotenv for env variables (already installed)
- Consider: SendGrid, AWS SES, or Gmail SMTP

**Task 1.2:** Create Email Configuration
- File: `backend/constants/emailConfig.js`
- Define: SMTP host, port, auth credentials
- Support: Environment-based configuration
- Create: `.env.example` with email variables

**Task 1.3:** Create Email Service
- File: `backend/services/emailService.js`
- Implement: SMTP connection & send logic
- Add: HTML/Text template support
- Include: Error handling & logging

### Phase 2: Database & Query Layer (Priority: HIGH)
**Task 2.1:** Enhance User Repository
- File: `backend/repositories/userRepository.js`
- Method: `getUsersByRoleIds(roleIds)` - Get users for multiple roles
- Method: `getUsersByRole(roleName)` - Get users for single role
- Include: Filtering by status/active flag if needed

**Task 2.2:** Create User-Role Query
- SQL: Join users → user_roles → roles
- Return: email, name, role info
- Filter: Active users only

### Phase 3: Business Logic (Priority: HIGH)
**Task 3.1:** Create Notification Service
- File: `backend/services/notificationService.js`
- Implement: `notifyRoleUsersOfEvent(event, eventRoles)`
- Include: Email template formatting
- Add: Error handling & retry logic

**Task 3.2:** Create Email Templates
- Directory: `backend/templates/emails/`
- Templates:
  - `eventCreated.html` - HTML email template
  - `eventCreated.txt` - Plain text fallback
- Include: Event details, link to event, CTA buttons

**Task 3.3:** Event-Role Query Service
- Create: Query to get role IDs from event
- Create: Query to get users from role IDs
- Implement: In EventRepository or separate helper

### Phase 4: Integration (Priority: HIGH)
**Task 4.1:** Update Event Controller
- File: `backend/controllers/eventController.js`
- After `eventRepository.createWithRoles()` succeeds:
  - Get created event ID
  - Call: `notificationService.notifyRoleUsersOfEvent(event, eventRoles)`
  - Catch errors without failing event creation
  - Log results

**Task 4.2:** Update Chat Controller
- File: `backend/controllers/chatController.js`
- After chat-triggered event creation:
  - Same notification logic
  - Pass full event object
  - Log notification outcome

**Task 4.3:** Add Idempotency & Tracking
- Create: `email_notifications` table (optional)
  - Track: notification_id, event_id, user_id, email, status, sent_at
  - Purpose: Retry failed notifications
- OR: Use logging service for audit trail

### Phase 5: Error Handling & Monitoring (Priority: MEDIUM)
**Task 5.1:** Implement Graceful Degradation
- If email fails, don't fail event creation
- Log: Errors with stack trace
- Queue: Failed emails for retry

**Task 5.2:** Add Retry Logic
- Retry: Failed emails after 5 minutes
- Max Retries: 3 attempts
- Backoff: Exponential delay between retries

**Task 5.3:** Logging & Monitoring
- Log: Email sent, failed, retried
- Track: Delivery rates
- Monitor: SMTP connection health

### Phase 6: Testing & Deployment (Priority: MEDIUM)
**Task 6.1:** Unit Tests
- Test: Email service sendEmail()
- Test: Notification service getUsersByRoles()
- Test: Template formatting

**Task 6.2:** Integration Tests
- Test: Event creation → notification flow
- Test: Chat trigger → notification flow
- Test: Error scenarios

**Task 6.3:** Manual Testing
- Create test event via API
- Create test event via chat
- Verify: Email received
- Verify: Email content

**Task 6.4:** Documentation
- Document: Email configuration
- Document: Template variables
- Document: Troubleshooting

---

## 5. Technical Specifications

### 5.1 Email Provider Options

| Provider | Pros | Cons | Cost |
|----------|------|------|------|
| **Gmail SMTP** | Free, Simple | Rate limits, Not for production | Free |
| **Nodemailer + Local SMTP** | Full control | Complex setup | Self-hosted |
| **SendGrid** | Reliable, Good docs | Pricing | Paid (free tier: 100/day) |
| **AWS SES** | Scalable, AWS integration | Setup complexity | Paid (cheap) |
| **Mailgun** | Good APIs, Reliable | Pricing | Paid (free tier: 1000/month) |

**Recommendation:** Start with SendGrid for ease of setup and reliability.

### 5.2 Email Template Variables

```
Event Name:        ${event.name}
Subheading:        ${event.subheading}
Description:       ${event.description}
Start Time:        ${event.start_time}
End Time:          ${event.end_time}
Timezone:          ${event.timezone}
Your Role:         ${userRole}
Created By:        ${createdByUser.name}
Event Link:        ${appURL}/events/${event.id}
```

### 5.3 Email Trigger Points

**Trigger 1: Event Controller**
```javascript
// In eventController.js createEvent()
const event = await eventRepository.createWithRoles(payload, payload.roles);
// NEW: Send notifications
try {
  await notificationService.notifyRoleUsersOfEvent(event, payload.roles);
} catch (error) {
  // Log but don't fail
  logger.error('Email notification failed', { eventId: event.id, error });
}
res.status(201).json(event);
```

**Trigger 2: Chat Controller**
```javascript
// In chatController.js after confirmation
const newEvent = await eventRepository.createWithRoles({...}, eventRoles);
// NEW: Send notifications
try {
  await notificationService.notifyRoleUsersOfEvent(newEvent, eventRoles);
} catch (error) {
  logger.error('Notification failed for chat event', { error });
}
```

### 5.4 Database Schema Additions (Optional)

```sql
-- Optional: Track email notifications for audit/retry
CREATE TABLE email_notifications (
    id BIGSERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    role_name VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, bounced
    attempt_count INT DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_notifications_event_id ON email_notifications(event_id);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_next_retry ON email_notifications(next_retry_at);
```

---

## 6. Environment Configuration

### 6.1 `.env` Variables

```env
# Email Configuration
EMAIL_PROVIDER=sendgrid              # or nodemailer, aws-ses, mailgun
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Event Management System

# SendGrid (if using SendGrid)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Nodemailer (if using SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Settings
EMAIL_ENABLED=true                   # Toggle notifications
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY_MS=300000          # 5 minutes

# Application
APP_URL=http://localhost:3000        # For email links
```

### 6.2 `.env.example`

```env
# Copy this to .env and fill in your values
EMAIL_PROVIDER=sendgrid
EMAIL_FROM_ADDRESS=
EMAIL_FROM_NAME=Event Management System
SENDGRID_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_ENABLED=true
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY_MS=300000
APP_URL=
```

---

## 7. File Structure

```
backend/
├── constants/
│   └── emailConfig.js                    [NEW]
├── services/
│   ├── emailService.js                   [NEW] - SMTP/Provider integration
│   ├── notificationService.js            [NEW] - Orchestrates notifications
│   └── ... (existing)
├── repositories/
│   ├── userRepository.js                 [MODIFIED] - Add getUsersByRoleIds()
│   ├── eventRepository.js                [MODIFIED] - Add role query helpers
│   └── ... (existing)
├── controllers/
│   ├── eventController.js                [MODIFIED] - Trigger notifications
│   ├── chatController.js                 [MODIFIED] - Trigger notifications
│   └── ... (existing)
├── templates/
│   └── emails/                           [NEW]
│       ├── eventCreated.html             [NEW] - HTML template
│       └── eventCreated.txt              [NEW] - Text template
├── migrations/
│   └── addEmailNotificationsTable.sql    [NEW] - Optional tracking table
├── package.json                          [MODIFIED] - Add nodemailer
└── .env.example                          [MODIFIED] - Add email config
```

---

## 8. Dependencies to Install

```bash
npm install nodemailer

# Optional (if using specific providers)
# npm install @sendgrid/mail
# npm install aws-sdk
# npm install mailgun.js
```

**Note:** Nodemailer supports all providers, so starting with just nodemailer is recommended.

---

## 9. Error Handling Strategy

### 9.1 Error Scenarios

| Scenario | Action | Impact | Recovery |
|----------|--------|--------|----------|
| Email service down | Log error, continue | Notification missed | Retry queue |
| Invalid email address | Log & skip user | User doesn't get email | Manual send later |
| SMTP auth failed | Log error, disable email | No emails sent | Check credentials |
| Database query fails | Log & fail gracefully | No notification list | Event still created |
| Event creation fails | Don't send email | N/A | User retries event |

### 9.2 Logging Strategy

All operations logged using existing `loggingService`:
- Notification attempt: `INFO`
- Email sent: `INFO`
- Email failed: `WARN`
- Service error: `ERROR`
- Configuration issue: `ERROR`

---

## 10. Security Considerations

### 10.1 Email Content Security
- No sensitive data in email bodies
- No password resets via email in scope
- Use generic event links (no auth tokens)

### 10.2 SMTP Security
- Use environment variables for credentials
- Never log credentials
- Use TLS/SSL for SMTP connection
- Validate certificate (nodemailer default)

### 10.3 Rate Limiting
- Implement: 1 email per second per user
- Purpose: Prevent mailbox flooding
- Monitoring: Alert on unusual patterns

### 10.4 Unsubscribe (Future)
- Add: Unsubscribe link in email footer
- Create: `user_notification_preferences` table
- Allow: Users to opt-out per role/event type

---

## 11. Testing Checklist

### 11.1 Unit Tests
- [ ] Email service initializes correctly
- [ ] Email formatting with template variables works
- [ ] getUsersByRoleIds returns correct users
- [ ] Error handling doesn't throw exceptions

### 11.2 Integration Tests
- [ ] Event API creation → emails sent
- [ ] Chat event creation → emails sent
- [ ] Multiple roles → all users notified
- [ ] User without email → skipped gracefully

### 11.3 Manual Tests
- [ ] Create event via API → receive email in test account
- [ ] Create event via chat → receive email
- [ ] Verify: Email content, sender, subject
- [ ] Verify: Links work
- [ ] Verify: HTML rendering in different clients

### 11.4 Edge Cases
- [ ] No users for a role → no error
- [ ] Duplicate email addresses → sent once
- [ ] Missing email in users table → handled
- [ ] SMTP timeout → logged & retried
- [ ] Event with 0 roles → no emails sent

---

## 12. Rollout Strategy

### Phase 1: Development
- Implement on feature branch
- Use test SendGrid account
- Test with dummy emails

### Phase 2: Staging
- Deploy to staging environment
- Run full integration tests
- Test with real email addresses (staging team)
- Load testing with 100+ notifications

### Phase 3: Production
- Deploy to production with feature flag
- Start with 10% of events
- Monitor email delivery rates
- Gradually increase to 100%
- Have rollback plan ready

### Feature Flag Implementation
```javascript
// In notificationService
if (!process.env.EMAIL_NOTIFICATIONS_ENABLED) {
  logger.info('Email notifications disabled');
  return;
}
```

---

## 13. Monitoring & Metrics

### 13.1 Key Metrics
- Total emails sent per day
- Email delivery success rate
- Failed email retry attempts
- Average send time
- SMTP connection health

### 13.2 Alerts
- Alert if send success rate < 90%
- Alert if SMTP connection fails
- Alert if queue grows beyond threshold
- Alert on configuration errors

### 13.3 Logging Points
- Event created with role list
- Users identified for roles
- Email send initiated
- Email send success/failure
- Any exceptions or timeouts

---

## 14. Future Enhancements

### 14.1 Phase 2 Features
- [ ] User notification preferences (opt-in/opt-out)
- [ ] Email digest (combine multiple events)
- [ ] Scheduled notifications (send at specific time)
- [ ] Email templates per role
- [ ] Admin dashboard for email monitoring

### 14.2 Phase 3 Features
- [ ] SMS notifications
- [ ] In-app notifications (notification center)
- [ ] Push notifications
- [ ] Event update notifications (not just creation)
- [ ] Custom email templates per event

### 14.3 Advanced Features
- [ ] A/B testing email templates
- [ ] Engagement tracking (opens, clicks)
- [ ] Unsubscribe management
- [ ] Email preference center
- [ ] Multi-language email templates

---

## 15. Success Criteria

✅ **Implementation Complete When:**
1. Email service successfully sends emails via chosen provider
2. Notifications sent automatically after event creation (both API & chat)
3. All users with assigned roles receive notification
4. Email failures don't prevent event creation
5. All failures logged for audit trail
6. Integration tests pass
7. Manual testing successful in staging
8. Documentation complete
9. Team trained on new system
10. Monitoring & alerts in place

---

## 16. Timeline Estimate

| Phase | Tasks | Duration | Resources |
|-------|-------|----------|-----------|
| Phase 1 | Setup infrastructure | 2-3 days | 1 dev |
| Phase 2 | Database & queries | 2-3 days | 1 dev |
| Phase 3 | Business logic | 3-4 days | 1 dev |
| Phase 4 | Integration | 2-3 days | 1 dev |
| Phase 5 | Error handling | 2-3 days | 1 dev |
| Phase 6 | Testing & deploy | 3-4 days | 1-2 devs |
| **Total** | | **14-20 days** | 1 dev (sequentially) |

---

## 17. References & Resources

### 17.1 Documentation Links
- [Nodemailer Official Docs](https://nodemailer.com/)
- [SendGrid Node.js Docs](https://docs.sendgrid.com/for-developers/sending-email/v3-nodejs-code-examples)
- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

### 17.2 Code Patterns in Project
- Error handling: See `errorHandler.js` middleware
- Async patterns: See `asyncHandler.js`
- Repository pattern: See `eventRepository.js`
- Service pattern: See `authService.js`
- Logging: See `loggingService.js`

---

## 18. Owner & Stakeholders

- **Owner:** [Developer Name]
- **Stakeholders:** Event admins, End users
- **PM:** [Project Manager Name]
- **Review:** [Code Reviewer Name]

---

## Appendix A: Email Template Draft

```html
<!-- eventCreated.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: #007bff; color: white; padding: 20px; }
        .content { padding: 20px; background: #f8f9fa; }
        .event-details { background: white; padding: 15px; margin: 10px 0; }
        .cta-button { 
            background: #007bff; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 10px 0;
        }
        .footer { text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Event Created</h1>
        </div>
        <div class="content">
            <p>Hello {{userName}},</p>
            <p>A new event has been created that is relevant to your role as <strong>{{userRole}}</strong>.</p>
            
            <div class="event-details">
                <h2>{{eventName}}</h2>
                <p><strong>{{eventSubheading}}</strong></p>
                <p>{{eventDescription}}</p>
                <p><strong>Start:</strong> {{eventStartTime}}</p>
                <p><strong>End:</strong> {{eventEndTime}}</p>
                <p><strong>Timezone:</strong> {{eventTimezone}}</p>
            </div>
            
            <p>
                <a href="{{eventLink}}" class="cta-button">View Event</a>
            </p>
            
            <p>Best regards,<br>Event Management System</p>
        </div>
        <div class="footer">
            <p>© 2026 Event Management System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

---

**Document End**
