-- =========================================================
-- DATABASE BOOTSTRAP SCRIPT
-- =========================================================
-- Usage:
--   psql -U postgres -f database.sql
--
-- This script:
-- 1. creates the application database if it does not already exist
-- 2. connects to that database
-- 3. applies the full schema and seed data from backend/Database.sql

\set db_name ai_conversational

SELECT format('CREATE DATABASE %I', :'db_name')
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_database
    WHERE datname = :'db_name'
)\gexec

\connect :db_name

\i backend/Database.sql
