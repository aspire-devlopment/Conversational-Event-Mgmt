-- =========================================
-- DATABASE SCHEMA: EVENT MANAGEMENT SYSTEM
-- =========================================
-- Usage:
--   psql -U postgres -f backend/Database.sql
--
-- This script creates the application database if it does not exist,
-- connects to it, and then applies the full schema and seed data.

\set db_name EVENT_MANAGEMENT_SYSTEM

SELECT format('CREATE DATABASE %I', :'db_name')
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_database
    WHERE datname = :'db_name'
)\gexec

\connect :db_name

-- =========================
-- 1. ROLES TABLE
-- =========================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- =========================
-- 2. USERS TABLE
-- =========================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    contact_number VARCHAR(20),
    password_hash TEXT,
    role_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE SET NULL
);

-- =========================
-- 3. EVENTS TABLE
-- =========================
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subheading VARCHAR(255),
    description TEXT,
    banner_url TEXT,
    timezone VARCHAR(50) NOT NULL,
    status VARCHAR(20)
        CHECK (status IN ('Draft', 'Published', 'Pending'))
        DEFAULT 'Draft',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    vanish_time TIMESTAMP,
    language VARCHAR(10) DEFAULT 'en',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_event_dates
        CHECK (start_time < end_time),
    CONSTRAINT chk_vanish_time
        CHECK (vanish_time IS NULL OR vanish_time > end_time)
);

-- =========================
-- 4. EVENT_ROLES TABLE (M:N)
-- =========================
CREATE TABLE event_roles (
    event_id INT,
    role_id INT,
    PRIMARY KEY (event_id, role_id),
    CONSTRAINT fk_event_roles_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE
);

-- =========================
-- 5. CHAT SESSIONS TABLE
-- =========================
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY,
    user_id INT,
    session_data JSONB NOT NULL,
    current_step VARCHAR(100),
    language VARCHAR(10),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- =========================
-- 6. IDEMPOTENCY KEYS
-- =========================
CREATE TABLE idempotency_keys (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    scope VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    response_status_code INT,
    response_body JSONB,
    resource_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_idempotency_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_idempotency_scope_key
        UNIQUE (user_id, scope, idempotency_key)
);

-- =========================
-- 7. ERROR LOGS
-- =========================
CREATE TABLE error_logs (
    id BIGSERIAL PRIMARY KEY,
    trace_id UUID,
    method VARCHAR(10),
    path TEXT,
    status_code INT,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    request_body JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =========================
-- INDEXES
-- =========================
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_event_roles_event_id ON event_roles(event_id);
CREATE INDEX idx_event_roles_role_id ON event_roles(role_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX idx_chat_sessions_expires_at ON chat_sessions(expires_at);
CREATE INDEX idx_idempotency_keys_created_at ON idempotency_keys(created_at DESC);
CREATE INDEX idx_idempotency_keys_request_hash ON idempotency_keys(request_hash);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_trace_id ON error_logs(trace_id);




-- =========================
-- SEED DATA (ROLES)
-- =========================
INSERT INTO roles (name) VALUES ('Admin'), ('Manager'), ('Sales Rep'), ('Viewer')
ON CONFLICT (name) DO NOTHING;

-- =========================
-- SEED DATA (TEST ADMINS)
--Password: TestAdmin123!
-- =========================

INSERT INTO users (first_name, last_name, email, contact_number, password_hash, role_id)
VALUES (
    'Test',
    'Admin',
    'testadmin@example.com',
    '555-000-0002',
    '$2b$10$M9j4nxRhiesxNeaTthiVf.rDdyQ9zgFvOC82hNQVK66FQ.yIwdkXi',
    (SELECT id FROM roles WHERE name = 'Admin')
)
ON CONFLICT (email) DO NOTHING;
