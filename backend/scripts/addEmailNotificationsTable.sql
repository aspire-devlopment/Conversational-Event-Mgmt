/**
 * File: addEmailNotificationsTable.sql
 * Purpose: Database migration to add email notification tracking table
 * Description: Creates table to track all email notifications sent to users
 *              Enables audit trail, failure investigation, and retry management
 *
 * Table Design:
 * - Tracks every email send attempt
 * - Records success/failure status
 * - Stores error details for debugging
 * - Enables retry mechanism for failed emails
 * - Supports metrics and reporting
 *
 * Usage:
 *   psql -U postgres -d EVENT_MANAGEMENT_SYSTEM -f backend/scripts/addEmailNotificationsTable.sql
 *
 * After running:
 * - Check: SELECT * FROM email_notifications;
 * - Monitor: SELECT status, COUNT(*) FROM email_notifications GROUP BY status;
 */

-- =========================================
-- EMAIL NOTIFICATIONS TRACKING TABLE
-- =========================================
-- Purpose: Audit trail for all email notifications sent in system
-- Records: recipient, event, role, send status, retry history, errors

CREATE TABLE IF NOT EXISTS email_notifications (
    -- Primary key: Unique identifier for each notification
    id BIGSERIAL PRIMARY KEY,

    -- Foreign keys: Link to event and user
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Email details: What was sent
    recipient_email VARCHAR(255) NOT NULL,
    email_subject VARCHAR(500),
    
    -- Event and user context: For filtering and reporting
    role_name VARCHAR(50),
    user_first_name VARCHAR(100),
    user_email_at_send VARCHAR(255),  -- Email as it was at send time
    
    -- Job tracking: Tie to queue job
    queue_job_id VARCHAR(100),  -- Bull queue job ID for correlation
    
    -- Status tracking: Current state of notification
    -- Values: 'pending' (queued), 'sent' (successful), 'failed' (all retries exhausted),
    --         'bounced' (provider returned), 'complained' (user reported)
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- Retry logic: Track attempt count
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    
    -- Error details: Diagnostic information
    last_error TEXT,                 -- Last error message
    last_error_code VARCHAR(50),     -- SMTP error code if available
    error_stack TEXT,                -- Full error stack for debugging
    
    -- Timing: When was each attempt made
    first_attempt_at TIMESTAMP,      -- When first attempt was made
    last_attempt_at TIMESTAMP,       -- When last attempt was made
    next_retry_at TIMESTAMP,         -- When next retry is scheduled
    sent_at TIMESTAMP,               -- When finally sent (if successful)
    
    -- Provider responses: Integration with external services
    smtp_response TEXT,              -- SMTP server response
    provider_message_id VARCHAR(255), -- ID from email provider (SendGrid, etc.)
    provider_status VARCHAR(50),     -- Provider's status (if using API)
    
    -- Metadata: Additional context
    metadata JSONB,  -- Store additional data as JSON
                     -- Examples: template variables, user device, browser, etc.
    
    -- Audit: Timestamps for record-keeping
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints: Data integrity
    CONSTRAINT fk_email_notifications_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_email_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT chk_email_notifications_status
        CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'complained')),
    
    CONSTRAINT chk_email_notifications_attempt
        CHECK (attempt_count >= 0 AND attempt_count <= max_attempts)
);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================
-- Purpose: Speed up common queries for monitoring and filtering

-- Index 1: Find notifications by status (for processing dashboard)
-- Usage: SELECT * FROM email_notifications WHERE status = 'failed'
CREATE INDEX IF NOT EXISTS idx_email_notifications_status 
    ON email_notifications(status);

-- Index 2: Find notifications by event (for event investigation)
-- Usage: SELECT * FROM email_notifications WHERE event_id = 123
CREATE INDEX IF NOT EXISTS idx_email_notifications_event_id 
    ON email_notifications(event_id);

-- Index 3: Find notifications by user (for user history)
-- Usage: SELECT * FROM email_notifications WHERE user_id = 456
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id 
    ON email_notifications(user_id);

-- Index 4: Find next retry candidates (for retry scheduler)
-- Usage: SELECT * FROM email_notifications WHERE status = 'failed' 
--        AND next_retry_at <= NOW()
CREATE INDEX IF NOT EXISTS idx_email_notifications_next_retry 
    ON email_notifications(next_retry_at) 
    WHERE status = 'failed';

-- Index 5: Find by email recipient (for bounce/complaint handling)
-- Usage: SELECT * FROM email_notifications WHERE recipient_email = 'user@example.com'
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient 
    ON email_notifications(recipient_email);

-- Index 6: Recent notifications (for monitoring dashboard)
-- Usage: SELECT * FROM email_notifications ORDER BY created_at DESC LIMIT 100
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at 
    ON email_notifications(created_at DESC);

-- Index 7: Complex query: Event + Status
-- Usage: SELECT * FROM email_notifications 
--        WHERE event_id = 123 AND status = 'failed'
CREATE INDEX IF NOT EXISTS idx_email_notifications_event_status 
    ON email_notifications(event_id, status);

-- Index 8: Pending retry candidates
-- Usage: Find emails ready for retry
CREATE INDEX IF NOT EXISTS idx_email_notifications_retry_candidates 
    ON email_notifications(next_retry_at, status) 
    WHERE status = 'failed' AND attempt_count < max_attempts;

-- =========================================
-- VIEWS FOR COMMON QUERIES
-- =========================================

-- View 1: Summary statistics by status
CREATE OR REPLACE VIEW email_notifications_summary AS
SELECT 
    status,
    COUNT(*) as total_count,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM email_notifications
GROUP BY status;

-- View 2: Failed notifications ready for retry
CREATE OR REPLACE VIEW email_notifications_pending_retry AS
SELECT 
    id,
    event_id,
    user_id,
    recipient_email,
    role_name,
    attempt_count,
    max_attempts,
    last_error,
    next_retry_at,
    EXTRACT(EPOCH FROM (next_retry_at - NOW())) as seconds_until_retry
FROM email_notifications
WHERE status = 'failed' 
  AND attempt_count < max_attempts
  AND next_retry_at IS NOT NULL
ORDER BY next_retry_at ASC;

-- View 3: Event delivery status
CREATE OR REPLACE VIEW email_notifications_by_event AS
SELECT 
    event_id,
    COUNT(*) as total_notifications,
    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    ROUND(
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100,
        2
    ) as success_percentage
FROM email_notifications
GROUP BY event_id;

-- View 4: User notification history
CREATE OR REPLACE VIEW email_notifications_user_history AS
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
    MAX(created_at) as last_notification
FROM email_notifications
GROUP BY user_id;

-- =========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =========================================

-- Trigger: Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_notifications_update_timestamp
    BEFORE UPDATE ON email_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_email_notifications_updated_at();

-- =========================================
-- SAMPLE DATA FOR TESTING
-- =========================================

-- Insert test notification (only if development environment)
-- Comment out or remove in production
-- INSERT INTO email_notifications (
--     event_id, user_id, recipient_email, email_subject, role_name, 
--     status, attempt_count
-- ) VALUES (
--     1, 1, 'test@example.com', 'New Event Created', 'Admin', 'sent', 1
-- ) ON CONFLICT DO NOTHING;

-- =========================================
-- CLEANUP PROCEDURES (OPTIONAL)
-- =========================================
-- Uncomment to add maintenance procedures

-- Drop old records (keep last 6 months)
-- DELETE FROM email_notifications 
-- WHERE created_at < NOW() - INTERVAL '6 months'
-- AND status IN ('sent', 'bounced', 'complained');

-- Archive old records to separate table
-- CREATE TABLE email_notifications_archive AS
-- SELECT * FROM email_notifications
-- WHERE created_at < NOW() - INTERVAL '1 year';
-- DELETE FROM email_notifications
-- WHERE id IN (SELECT id FROM email_notifications_archive);

-- =========================================
-- COMPLETION MESSAGE
-- =========================================
-- Verify table created
SELECT '✅ email_notifications table created' AS status;
SELECT COUNT(*) as total_indexes FROM pg_indexes 
WHERE tablename = 'email_notifications';
