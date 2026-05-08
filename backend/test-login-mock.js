/**
 * Test login with a mock repository to bypass DB entirely
 * This helps us determine if the SASL error originates from DB access or elsewhere
 */
require('./config/env');

const AuthService = require('./services/authService');
const JWTTokenService = require('./utils/jwtToken');
const { hashPassword, comparePassword } = require('./utils/passwordService');

// Mock user repository that returns test data without hitting DB
class MockUserRepository {
  async findByEmail(email) {
    if (email.toLowerCase() === 'testadmin@example.com') {
      return {
        id: 1,
        email: 'testadmin@example.com',
        first_name: 'Test',
        last_name: 'Admin',
        contact_number: '555-000-0002',
        role: 'Admin',
        role_id: 1,
        // Password hash for 'TestAdmin123!' (from seeded admin)
        password_hash: '$2b$10$M9j4nxRhiesxNeaTthiVf.rDdyQ9zgFvOC82hNQVK66FQ.yIwdkXi',
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
    return null;
  }
}

(async () => {
  try {
    console.log('=== Testing Login with Mock Repository ===\n');

    const mockRepo = new MockUserRepository();
    const authService = new AuthService(mockRepo);

    // Attempt login
    console.log('Attempting login...');
    const result = await authService.login('testadmin@example.com', 'TestAdmin123!');

    console.log('\n✅ LOGIN SUCCESS!');
    console.log('Token:', result.token ? result.token.substring(0, 20) + '...' : 'N/A');
    console.log('User:', JSON.stringify(result.user, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ LOGIN FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
