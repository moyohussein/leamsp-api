import axios from 'axios';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';

// Load environment variables
dotenv.config();

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:8787';
const TEST_EMAIL = `test-${randomBytes(4).toString('hex')}@example.com`;
const TEST_PASSWORD = 'Test@1234';
const TEST_DISPLAY_NAME = 'Test User';

// Test data
const testUser = {
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  password_confirmation: TEST_PASSWORD, // Add password confirmation
  name: 'Test User',
};

const idCardData = {
  displayName: TEST_DISPLAY_NAME,
  attributes: {
    role: 'Member',
    organization: 'Test Org',
    department: 'Engineering'
  }
};

// Helper function to make authenticated requests
const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

// Test runner
async function runTests() {
  console.log('🚀 Starting ID Card Generation Test');
  console.log(`🔗 API Base URL: ${BASE_URL}`);
  
  try {
    // 1. Register a test user
    console.log('\n1. Registering test user...');
    await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    console.log('✅ User registered successfully');
    
    // 2. Login to get auth token
    console.log('\n2. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    const authToken = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // 3. Test ID Card Generation
    console.log('\n3. Testing ID Card Generation...');
    const idCardResponse = await axios.post(
      `${BASE_URL}/api/id-cards/generate`,
      idCardData,
      { headers: getAuthHeaders(authToken) }
    );
    
    console.log('✅ ID Card generated successfully');
    console.log('📋 Response:', JSON.stringify(idCardResponse.data, null, 2));
    
    // 4. Verify the generated card has required fields
    const card = idCardResponse.data.data;
    const requiredFields = ['id', 'displayName', 'memberId', 'memberSince', 'dateOfGeneration', 'validUntil'];
    
    const missingFields = requiredFields.filter(field => !(field in card));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    console.log('✅ All required fields present in response');
    
    // 5. Verify the dates are set correctly
    const now = new Date();
    const memberSince = new Date(card.memberSince);
    const dateOfGeneration = new Date(card.dateOfGeneration);
    const validUntil = new Date(card.validUntil);
    
    // Verify dates are valid
    if (isNaN(memberSince.getTime()) || isNaN(dateOfGeneration.getTime()) || isNaN(validUntil.getTime())) {
      throw new Error('Invalid date format in response');
    }
    
    // Verify validUntil is approximately 1 year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    const oneDay = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    const daysDifference = Math.abs((validUntil.getTime() - oneYearFromNow.getTime()) / oneDay);
    
    if (daysDifference > 2) { // Allow 2 days difference for timezone/DST issues
      throw new Error(`validUntil date (${validUntil.toISOString()}) is not approximately 1 year from now`);
    }
    
    console.log('✅ Date validation passed');
    
    // 6. Verify memberId format (LEA-{userId}-{YYYYMM})
    const memberIdRegex = /^LEA-\d+-\d{6}$/;
    if (!memberIdRegex.test(card.memberId)) {
      throw new Error(`Invalid memberId format: ${card.memberId}`);
    }
    
    console.log('✅ Member ID format is valid');
    
    console.log('\n🎉 All tests passed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the tests
runTests();
