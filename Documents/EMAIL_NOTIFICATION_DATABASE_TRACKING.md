# Email Notification Tracking Database

## Overview

A **production-grade tracking system** that records all email notifications sent in the database. This provides:
- ✅ Audit trail for compliance
- ✅ Easy investigation of failures
- ✅ Automatic retry scheduling
- ✅ Delivery metrics and reporting
- ✅ Support for manual interventions

---

## Database Table: `email_notifications`

### Schema

```sql
-- Core Information
id BIGSERIAL PRIMARY KEY           -- Unique notification ID
event_id INT NOT NULL              -- Which event triggered this
user_id INT NOT NULL               -- Who received this
recipient_email VARCHAR(255)       -- Email address sent to
email_subject VARCHAR(500)         -- Subject line
role_name VARCHAR(50)              -- User's role (Admin, Manager, etc.)

-- Job Tracking
queue_job_id VARCHAR(100)          -- Bull queue job ID (for correlation)

-- Status & Retry
status VARCHAR(20)                 -- pending | sent | failed | bounced | complained
attempt_count INT                  -- How many times sent/tried
max_attempts INT                   -- Max retry attempts (default 3)
next_retry_at TIMESTAMP            -- When to retry if failed

-- Error Details
last_error TEXT                    -- Last error message
last_error_code VARCHAR(50)        -- SMTP error code (e.g., "ETIMEDOUT")
error_stack TEXT                   -- Full error stack for debugging
last_error_at TIMESTAMP            -- When last error occurred

-- Provider Integration
smtp_response TEXT                 -- SMTP server response
provider_message_id VARCHAR(255)   -- ID from SendGrid/AWS/etc
provider_status VARCHAR(50)        -- Provider status (if using API)

-- Timestamps
created_at TIMESTAMP               -- When notification created
updated_at TIMESTAMP               -- Last update time
first_attempt_at TIMESTAMP         -- First send attempt
last_attempt_at TIMESTAMP          -- Last send attempt
sent_at TIMESTAMP                  -- When successfully sent

-- Extra
metadata JSONB                     -- Additional context (JSON)
```

---

## Installation

### Step 1: Run Migration Script

```bash
cd backend
psql -U postgres -d EVENT_MANAGEMENT_SYSTEM -f scripts/addEmailNotificationsTable.sql
```

**Output should show:**
```
✅ email_notifications table created
        ?column?
─────────────────────────────────────
                  8
```

### Step 2: Verify Table Created

```bash
psql -U postgres -d EVENT_MANAGEMENT_SYSTEM

# In psql:
SELECT * FROM email_notifications LIMIT 1;

# Check views:
SELECT * FROM email_notifications_summary;
```

---

## Usage

### View 1: Check Delivery Status by Status

```sql
-- See summary of all notifications
SELECT * FROM email_notifications_summary;

-- Output:
--   status  | total_count | last_24h | last_7d |      oldest     |      newest
-- ─────────┼─────────────┼──────────┼─────────┼─────────────────┼─────────────────
--   sent    |        1250 |       185 |     892 |  2026-01-01     |  2026-05-06
--   failed  |          42 |         3 |      18 |  2026-01-15     |  2026-05-06
--   pending |          12 |         2 |       6 |  2026-05-05     |  2026-05-06
```

### View 2: Find Emails Ready for Retry

```sql
-- See which emails need to be retried
SELECT 
  id, 
  recipient_email, 
  role_name,
  attempt_count,
  last_error,
  next_retry_at,
  EXTRACT(EPOCH FROM (next_retry_at - NOW())) as seconds_until_retry
FROM email_notifications_pending_retry
ORDER BY next_retry_at ASC
LIMIT 10;

-- Output:
--    id   |    recipient_email    | role_name | attempt_count |      last_error      |      next_retry_at      | seconds_until_retry
-- ────────┼───────────────────────┼───────────┼───────────────┼──────────────────────┼─────────────────────────┼────────────────────
--    1234 | john@example.com      |   Admin   |       1       | Connection timeout   | 2026-05-06 15:30:00     |        125
--    1235 | jane@example.com      |  Manager  |       2       | SMTP 421 error       | 2026-05-06 16:45:00     |       3125
```

### View 3: Event Delivery Status

```sql
-- See which events have delivery issues
SELECT 
  event_id,
  total_notifications,
  sent_count,
  failed_count,
  pending_count,
  success_percentage
FROM email_notifications_by_event
WHERE success_percentage < 100
ORDER BY event_id DESC;

-- Output:
--   event_id | total | sent | failed | pending | success_%
-- ──────────┼───────┼──────┼────────┼─────────┼──────────
--        123 |   150 |  148 |      2 |       0 |     98.67
--        124 |   200 |  195 |      5 |       0 |     97.50
--        125 |    50 |    48 |      2 |       0 |     96.00
```

### View 4: User Notification History

```sql
-- See all notifications for a specific user
SELECT 
  id,
  event_id,
  email_subject,
  status,
  created_at,
  sent_at
FROM email_notifications
WHERE user_id = 456
ORDER BY created_at DESC
LIMIT 20;

-- Output:
--    id   | event_id |       email_subject        |  status | created_at | sent_at
-- ────────┼──────────┼────────────────────────────┼─────────┼────────────┼──────────────
--    5678 |      120 | New Event: Tech Conference |  sent   | 2026-05-06 | 2026-05-06
--    5677 |      119 | Event Update: Reschedule   |  sent   | 2026-05-05 | 2026-05-05
--    5676 |      118 | New Event: Team Meetup     |  sent   | 2026-05-05 | 2026-05-05
```

---

## Code Integration

### In queueService.addEmailJob() - Record queued email:

```javascript
// After adding job to queue, record in database
const emailNotificationRepo = new EmailNotificationRepository(dataContext);

const notification = await emailNotificationRepo.recordEmailQueued(
  jobData.metadata.eventId,      // event_id
  jobData.metadata.userId,       // user_id
  jobData.recipientEmail,        // recipient email
  jobData.subject,               // subject line
  jobData.metadata.userRole,     // role name
  jobData.metadata.userName,     // user first name
  job.id,                        // Bull queue job ID
  { template: 'eventCreated' }   // metadata
);

console.log(`Notification recorded: ID ${notification.id}`);
```

### In queueWorker - Record email sent:

```javascript
// After successful send
emailQueue.process(async (job) => {
  try {
    const result = await emailService.sendEmail(job.data);
    
    // Record success in database
    const notification = await emailNotificationRepo.recordEmailSent(
      job.data.metadata.notificationId,  // notification ID
      result.response,                   // SMTP response
      result.messageId                   // Message ID from provider
    );
    
    return { success: true, result };
  } catch (error) {
    // Record failure in database
    const notification = await emailNotificationRepo.recordEmailFailed(
      job.data.metadata.notificationId,  // notification ID
      error.message,                     // Error message
      error.code,                        // Error code
      error.stack,                       // Error stack
      5000                               // Retry after 5 seconds
    );
    
    throw error;  // Bull handles retry
  }
});
```

---

## Common Queries

### Find all failed emails for an event

```sql
SELECT 
  id,
  recipient_email,
  role_name,
  last_error,
  attempt_count,
  next_retry_at
FROM email_notifications
WHERE event_id = 123 AND status = 'failed'
ORDER BY created_at DESC;
```

### Get emails sent in last hour

```sql
SELECT 
  id,
  recipient_email,
  email_subject,
  status,
  sent_at
FROM email_notifications
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Find emails with multiple retry attempts

```sql
SELECT 
  id,
  recipient_email,
  attempt_count,
  last_error,
  last_attempt_at
FROM email_notifications
WHERE attempt_count >= 2
ORDER BY last_attempt_at DESC;
```

### Get success rate by role

```sql
SELECT 
  role_name,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  ROUND(
    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::NUMERIC / 
    COUNT(*) * 100,
    2
  ) as success_rate
FROM email_notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY role_name
ORDER BY success_rate DESC;
```

---

## Repository Methods

### EmailNotificationRepository

All methods documented in `backend/repositories/emailNotificationRepository.js`:

```javascript
const repo = new EmailNotificationRepository(dataContext);

// Record email when queued
await repo.recordEmailQueued(
  eventId, userId, email, subject, role, firstName, jobId, metadata
);

// Record successful send
await repo.recordEmailSent(notificationId, smtpResponse, providerMessageId);

// Record failed send
await repo.recordEmailFailed(
  notificationId, errorMessage, errorCode, errorStack, retryDelayMs
);

// Get pending retries
const pending = await repo.getPendingRetries(100);

// Get all notifications for event
const eventNotes = await repo.getNotificationsByEvent(eventId);

// Get notifications for user
const userNotes = await repo.getNotificationsByUser(userId, 50);

// Get failed notifications
const failed = await repo.getFailedNotifications(100);

// Get single notification
const notification = await repo.getNotificationById(id);

// Get statistics
const stats = await repo.getStatistics();
const recentStats = await repo.getStatisticsLastDay();

// Get event delivery summary
const eventSummary = await repo.getEventDeliverySummary(100);

// Manually retry notification
await repo.manuallyRetry(notificationId);

// Mark as bounced (from provider webhook)
await repo.markAsBounced(notificationId, providerResponse);

// Delete old records
await repo.deleteOldRecords(365);  // Delete records older than 1 year
```

---

## Monitoring Dashboard

### Example dashboard queries

```javascript
// Dashboard: Email metrics
const stats = await repo.getStatistics();
const today = await repo.getStatisticsLastDay();
const failed = await repo.getFailedNotifications(20);
const pending = await repo.getPendingRetries(20);
const eventSummary = await repo.getEventDeliverySummary(50);

const dashboard = {
  overall: stats,
  today: today,
  topFailedEvents: eventSummary
    .filter(e => e.success_rate < 95)
    .sort((a, b) => a.success_rate - b.success_rate)
    .slice(0, 5),
  failedEmails: failed.slice(0, 20),
  pendingRetries: pending.slice(0, 20),
};
```

---

## Scheduled Maintenance

### Retry Failed Emails (every 5 minutes)

```javascript
// In a scheduled job (node-cron, agenda, etc.)
const pending = await repo.getPendingRetries(100);
pending.forEach(notification => {
  // Re-queue for sending
  queueService.addEmailJob(
    notification.recipient_email,
    notification.email_subject,
    notification.html_content,
    notification.text_content,
    { notificationId: notification.id }
  );
});
```

### Archive Old Records (weekly)

```javascript
// Archive records older than 1 year
const deleted = await repo.deleteOldRecords(365);
console.log(`Archived ${deleted} old records`);
```

### Generate Weekly Report

```javascript
const stats = await repo.getStatistics();
const events = await repo.getEventDeliverySummary(100);

const report = {
  totalSent: stats.sent,
  totalFailed: stats.failed,
  successRate: stats.success_rate,
  eventsWithIssues: events.filter(e => e.success_rate < 99),
  timestamp: new Date(),
};

// Send report email or save to file
```

---

## Production Checklist

- [ ] Run migration script: `psql ... -f addEmailNotificationsTable.sql`
- [ ] Verify table created: `psql ... -c "\d email_notifications"`
- [ ] Add EmailNotificationRepository to data context
- [ ] Update notificationService to record emails in DB
- [ ] Update queueWorker to record send results
- [ ] Test: Create event, verify record in DB
- [ ] Setup monitoring dashboard
- [ ] Setup retry scheduler
- [ ] Setup archive job (weekly)
- [ ] Setup alerts for high failure rates
- [ ] Document for support team

---

## Benefits

✅ **Audit Trail**: Every email sent is recorded  
✅ **Failure Investigation**: See exact error and retry history  
✅ **Automatic Retries**: Failed emails queued for retry  
✅ **Compliance**: Track delivery for audits  
✅ **Reporting**: Built-in views for metrics  
✅ **Manual Intervention**: Retry specific emails on demand  
✅ **Performance**: Indexed queries for fast lookups  
✅ **Scalability**: Clean separation of concerns  

---

## Performance Notes

- Table is designed for high volume (BIGSERIAL for ID)
- Indexes on common queries (status, event_id, user_id, next_retry_at)
- Partitioning recommended for millions of records
- Archive old records regularly to maintain performance

---

**This tracking system provides production-ready email notification management!**
