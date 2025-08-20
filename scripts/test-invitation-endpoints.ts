import axios from 'axios';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

const BASE_URL = 'https://leamsp-api.attendance.workers.dev';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiMSIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiQURNSU4iLCJuYW1lIjoiVGVzdCBBZG1pbiJ9LCJpYXQiOjE3NTU2NjgxMzksImV4cCI6MTc1NTY3MTczOX0.NFXeaFvdahwJ3SqMK8bwm9rjzEdBTwpAdnO74i8OFM4';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

async function testEndpoints() {
  try {
    console.log('=== Testing Invitation Endpoints ===\n');

    // 1. Test creating an invitation
    console.log('1. Testing Create Invitation...');
    const testEmail = `test-${Date.now()}@example.com`;
    
    const createResponse = await axios.post(
      `${BASE_URL}/api/invitations`,
      {
        email: testEmail,
        role: 'USER',
        message: 'Test invitation'
      },
      { headers }
    );
    
    console.log('Create Invitation Response:', createResponse.data);
    const invitationToken = createResponse.data.data.token;
    
    // 2. Test listing invitations
    console.log('\n2. Testing List Invitations...');
    const listResponse = await axios.get(
      `${BASE_URL}/api/invitations?status=PENDING&page=1&pageSize=10`,
      { headers }
    );
    console.log('List Invitations Response:', listResponse.data);

    // 3. Test accepting the invitation
    console.log('\n3. Testing Accept Invitation...');
    const acceptResponse = await axios.post(
      `${BASE_URL}/api/invitations/accept`,
      {
        token: invitationToken,
        name: 'Test User',
        password: 'TestPassword123!'
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('Accept Invitation Response:', acceptResponse.data);

    // 4. Verify the invitation status was updated
    console.log('\n4. Verifying Invitation Status...');
    const verifyResponse = await axios.get(
      `${BASE_URL}/api/invitations?status=ACCEPTED&page=1&pageSize=10`,
      { headers }
    );
    console.log('Verify Status Response:', verifyResponse.data);

    console.log('\n=== All tests completed successfully! ===');
  } catch (error) {
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

testEndpoints();
