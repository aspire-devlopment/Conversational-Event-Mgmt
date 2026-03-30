#!/usr/bin/env node

/**
 * Script to check chat_sessions table schema
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

async function checkSchema() {
  try {
    console.log('\n=== CHECKING CHAT_SESSIONS TABLE SCHEMA ===\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_sessions'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ chat_sessions table does NOT exist');
      process.exit(1);
    }

    console.log('✅ chat_sessions table EXISTS\n');

    // Get column information
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'chat_sessions'
      ORDER BY ordinal_position
    `);

    console.log('📋 Columns in chat_sessions table:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   - ${col.column_name}: ${col.data_type} (${nullable})`);
    });

    // Check specifically for expires_at
    const expiresAtCheck = columns.rows.find(col => col.column_name === 'expires_at');
    if (expiresAtCheck) {
      console.log('\n✅ expires_at column EXISTS');
    } else {
      console.log('\n❌ expires_at column MISSING - THIS IS THE PROBLEM');
      console.log('\nNeed to add expires_at column to chat_sessions table');
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkSchema();
