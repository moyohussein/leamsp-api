import axios from 'axios';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:8787';

// Test credentials
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Test User';

async function testAuthFlow() {
  try {
    console.log('=== Testing Authentication Flow ===\n');

    // 1. Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await axios.post(
      `${BASE_URL}/api/auth/register`,
      {
        name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        password_confirmation: TEST_PASSWORD
      },
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      }
    );

    console.log('Registration Response:', {
      status: registerResponse.status,
      data: registerResponse.data
    });

    if (registerResponse.status !== 200) {
      throw new Error('User registration failed');
    }

    // 2. Test login
    console.log('\n2. Testing Login...');
    const loginResponse = await axios.post(
      `${BASE_URL}/api/auth/login`,
      {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      },
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true // Don't throw on non-2xx status
      }
    );

    console.log('Login Response:', {
      status: loginResponse.status,
      data: loginResponse.data
    });

    if (loginResponse.status !== 200) {
      throw new Error('Login failed. Please check credentials.');
    }

    const token = loginResponse.data?.data?.token;
    if (!token) {
      throw new Error('No token received in login response');
    }

    console.log('\n3. Testing Protected Endpoint...');
    // 2. Test a protected endpoint
    const profileResponse = await axios.get(
      `${BASE_URL}/api/profile`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );

    console.log('Profile Response:', {
      status: profileResponse.status,
      data: profileResponse.data
    });

    if (profileResponse.status !== 200) {
      throw new Error('Failed to access protected endpoint');
    }

    console.log('\n=== Authentication Test Passed! ===');
    return token;
  } catch (error) {
    console.error('\n=== Authentication Test Failed ===');
    if (axios.isAxiosError(error)) {
      console.error('Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Run the test
testAuthFlow().then(token => {
  console.log('\nUse this token for further API requests:');
  console.log(`Authorization: Bearer ${token}`);
});
