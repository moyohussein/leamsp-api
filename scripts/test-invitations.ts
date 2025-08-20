import axios from 'axios';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

// Configuration
const BASE_URL = 'https://leamsp-api.attendance.workers.dev';
const JWT_TOKEN = 'YOUR_ADMIN_JWT_TOKEN'; // Replace with a valid admin JWT token

// Headers for authenticated requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

async function testInvitationEndpoints() {
  try {
    console.log('=== Testing Invitation Endpoints ===\n');

    // 1. Test listing invitations (should be accessible to admins)
    console.log('1. Testing List Invitations...');
    const listResponse = await axios.get(
      `${BASE_URL}/api/invitations`,
      { headers, validateStatus: () => true }
    );
    
    console.log('List Invitations Response:', {
      status: listResponse.status,
      data: listResponse.data
    });

    // 2. Test creating an invitation (admin only)
    console.log('\n2. Testing Create Invitation...');
    const testEmail = `test-${Date.now()}@example.com`;
    
    const createResponse = await axios.post(
      `${BASE_URL}/api/invitations`,
      {
        email: testEmail,
        role: 'USER',
        message: 'Test invitation'
      },
      { 
        headers,
        validateStatus: () => true
      }
    );
    
    console.log('Create Invitation Response:', {
      status: createResponse.status,
      data: createResponse.data
    });

    const invitationId = createResponse.data?.data?.id;
    const invitationToken = createResponse.data?.data?.token;

    if (!invitationId || !invitationToken) {
      throw new Error('Failed to create invitation or get invitation token');
    }

    // 3. Test accepting the invitation (public endpoint, no auth required)
    console.log('\n3. Testing Accept Invitation...');
    const acceptResponse = await axios.post(
      `${BASE_URL}/api/invitations/accept`,
      {
        token: invitationToken,
        name: 'Test User',
        password: 'TestPassword123!'
      },
      { 
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      }
    );
    
    console.log('Accept Invitation Response:', {
      status: acceptResponse.status,
      data: acceptResponse.data
    });

    console.log('\n=== Invitation Endpoints Test Completed ===');
  } catch (error) {
    console.error('\n=== Test Failed ===');
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

// Run the tests
testInvitationEndpoints();
