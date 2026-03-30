#!/usr/bin/env node

/**
 * File: createTestAdmin.js
 * Purpose: Create or update a dedicated test admin user for local and Docker testing
 * Description: Inserts a deterministic admin account that can be used to log in immediately.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'EVENT_MANAGEMENT_SYSTEM',
});

const TEST_ADMIN = {
  firstName: 'Test',
  lastName: 'Admin',
  email: 'testadmin@example.com',
  contactNumber: '555-000-0002',
  password: 'TestAdmin123!',
  role: 'Admin',
};

async function createTestAdmin() {
  try {
    console.log('\n=== CREATING TEST ADMIN ===\n');

    const roleCheck = await pool.query(
      'SELECT id FROM roles WHERE name = $1 LIMIT 1',
      [TEST_ADMIN.role]
    );

    if (roleCheck.rows.length === 0) {
      throw new Error(`Role "${TEST_ADMIN.role}" not found. Run schema setup first.`);
    }

    const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 10);

    const result = await pool.query(
      `
        INSERT INTO users (
          first_name, last_name, email, contact_number, password_hash, role_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          contact_number = EXCLUDED.contact_number,
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, email
      `,
      [
        TEST_ADMIN.firstName,
        TEST_ADMIN.lastName,
        TEST_ADMIN.email,
        TEST_ADMIN.contactNumber,
        passwordHash,
        roleCheck.rows[0].id,
      ]
    );

    console.log('✅ Test admin is ready');
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Password: ${TEST_ADMIN.password}`);
    console.log(`   Role: ${TEST_ADMIN.role}`);
    console.log('\n');
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestAdmin();
