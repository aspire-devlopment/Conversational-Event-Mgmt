#!/usr/bin/env node

/**
 * File: addExpiresAtColumn.js
 * Purpose: Migration script to add missing expires_at column to chat_sessions table
 * Description: Adds the expires_at column if it doesn't exist
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'EVENT_MANAGEMENT_SYSTEM',
});

async function addExpiresAtColumn() {
  try {
    console.log('\n=== ADDING expires_at COLUMN TO chat_sessions TABLE ===\n');

    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'chat_sessions'
        AND column_name = 'expires_at'
      )
    `);

    if (checkColumn.rows[0].exists) {
      console.log('✅ expires_at column already exists');
      process.exit(0);
    }

    console.log('❌ expires_at column not found, adding it...\n');

    // Add the column
    await pool.query(`
      ALTER TABLE chat_sessions
      ADD COLUMN expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
    `);

    console.log('✅ expires_at column added successfully');

    // Create index on expires_at if it doesn't exist
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires_at ON chat_sessions(expires_at)
    `);

    console.log('✅ Index on expires_at created successfully');

    // Verify the column was added
    const verifyColumn = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'chat_sessions'
      AND column_name = 'expires_at'
    `);

    if (verifyColumn.rows.length > 0) {
      const col = verifyColumn.rows[0];
      console.log(`\n✅ Verification successful:`);
      console.log(`   Column: ${col.column_name}`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Nullable: ${col.is_nullable}`);
    }

    console.log('\n✅ MIGRATION COMPLETE\n');
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addExpiresAtColumn();
