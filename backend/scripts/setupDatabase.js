#!/usr/bin/env node

/**
 * File: setupDatabase.js
 * Purpose: Database initialization and schema setup script
 * Description: One-time script to create database tables and initial schema.
 *              Creates tables for users, roles, events, chat_sessions, event_roles, and error_logs.
 *              Run once during application setup: node scripts/setupDatabase.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'EVENT_MANAGEMENT_SYSTEM';

// Pool for connecting to 'postgres' database (system DB) to create the target DB
const adminPool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: 'postgres', // Connect to default postgres DB
});

// Pool for connecting to the target database
const targetPool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});

const schemaPath = path.join(__dirname, '..', 'schema.sql');

async function setupDatabase() {
  console.log('\n=== DATABASE SETUP ===\n');

  try {
    // Step 1: Check if database exists
    console.log(`📋 Checking if database "${DB_NAME}" exists...`);
    const dbCheckResult = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );

    if (dbCheckResult.rows.length === 0) {
      // Database doesn't exist, create it
      console.log(`❌ Database "${DB_NAME}" not found. Creating...`);
      await adminPool.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`✅ Database "${DB_NAME}" created successfully`);
    } else {
      console.log(`✅ Database "${DB_NAME}" already exists`);
    }

    // Step 2: Read and execute schema
    console.log('\n📄 Reading schema file...');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('✅ Schema file loaded');

    // Step 3: Execute schema
    console.log('\n🔨 Creating tables...');
    await targetPool.query(schema);
    console.log('✅ Tables created successfully');

    // Step 4: Verify tables were created
    console.log('\n📊 Verifying tables...');
    const tablesResult = await targetPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No tables found');
    } else {
      console.log(`✅ Found ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
    }

    console.log('\n✅ DATABASE SETUP COMPLETE\n');
    console.log('Connection Details:');
    console.log(`  Host: ${DB_HOST}`);
    console.log(`  Port: ${DB_PORT}`);
    console.log(`  Database: ${DB_NAME}`);
    console.log(`  User: ${DB_USER}\n`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await adminPool.end();
    await targetPool.end();
  }
}

setupDatabase();
