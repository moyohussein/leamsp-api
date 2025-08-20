import axios from 'axios';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

// Configuration
const BASE_URL = 'http://localhost:8787';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiMSIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiQURNSU4iLCJuYW1lIjoiVGVzdCBBZG1pbiJ9LCJpYXQiOjE3NTU2ODM4OTksImV4cCI6MTc1NTY4NzQ5OX0.ddxX3635pIRsj27nb51z5R3-mKMkg-9G-gvJNry_0KU'; // Test admin token

// Headers for authenticated requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

async function testProfileUpdate() {
  try {
    console.log('=== Testing Profile Update ===\n');
    
    // 1. Get current profile
    console.log('1. Fetching current profile...');
    const profileResponse = await axios.get(`${BASE_URL}/api/profile`, { headers });
    console.log('Current Profile:', profileResponse.data);
    
    // 2. Update profile
    console.log('\n2. Updating profile...');
    const updateData = {
      name: `Test User ${Date.now()}` // Update with a unique name
    };
    
    const updateResponse = await axios.put(
      `${BASE_URL}/api/profile`,
      updateData,
      { headers }
    );
    
    console.log('Update Response:', updateResponse.data);
    
    // 3. Verify update
    console.log('\n3. Verifying update...');
    const updatedProfile = await axios.get(`${BASE_URL}/api/profile`, { headers });
    console.log('Updated Profile:', updatedProfile.data);
    
    console.log('\n✅ Profile update test completed successfully!');
    return true;
  } catch (error: any) {
    console.error('\n❌ Profile update test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

async function testIdCardGeneration() {
  try {
    console.log('\n=== Testing ID Card Generation ===\n');
    
    // 1. Generate ID card
    console.log('1. Generating ID card...');
    const cardData = {
      displayName: `Test User ${Date.now()}`,
      attributes: {
        department: 'Testing',
        role: 'Tester'
      }
    };
    
    const generateResponse = await axios.post(
      `${BASE_URL}/api/id-cards/generate`,
      cardData,
      { headers }
    );
    
    console.log('Generate Response:', generateResponse.data);
    
    // 2. List ID cards to verify
    console.log('\n2. Listing ID cards...');
    const listResponse = await axios.get(`${BASE_URL}/api/id-cards`, { headers });
    console.log('ID Cards:', listResponse.data);
    
    console.log('\n✅ ID card generation test completed successfully!');
    return true;
  } catch (error: any) {
    console.error('\n❌ ID card generation test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

// Run the tests
async function runTests() {
  console.log('Starting API endpoint tests...\n');
  
  if (!JWT_TOKEN || JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('❌ Please set a valid JWT token in the script');
    return;
  }
  
  const profileSuccess = await testProfileUpdate();
  const idCardSuccess = await testIdCardGeneration();
  
  console.log('\n=== Test Summary ===');
  console.log(`Profile Update: ${profileSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`ID Card Generation: ${idCardSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (profileSuccess && idCardSuccess) {
    console.log('\n🎉 All tests passed successfully!');
  } else {
    console.log('\n❌ Some tests failed. Please check the logs above for details.');
  }
}

runTests();
