#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:8787';

async function testInvitationListOnly() {
  console.log('=== Testing Invitation List Functionality ===\n');
  
  try {
    // Create a fresh admin user
    console.log('1. Creating fresh admin user...');
    const adminEmail = `listtest-${Date.now()}@example.com`;
    
    await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'List Test Admin',
      email: adminEmail,
      password: 'AdminPassword123!',
      password_confirmation: 'AdminPassword123!'
    });
    
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: adminEmail,
      password: 'AdminPassword123!'
    });
    
    const adminToken = loginResponse.data.data.token;
    const adminUserId = loginResponse.data.data.user.id;
    console.log(`✓ Created admin user with ID: ${adminUserId}`);
    
    const headers = {
      'Authorization': `Bearer ${adminToken}`,  
      'Content-Type': 'application/json'
    };
    
    // Test default list
    console.log('\n2. Testing default invitation list...');
    const defaultResponse = await axios.get(`${BASE_URL}/api/invitations`, { headers });
    console.log('Default list response:', JSON.stringify(defaultResponse.data, null, 2));
    
    // Test status=ALL (should show all invitations by all users if admin)
    console.log('\n3. Testing list with status=ALL...');
    const allResponse = await axios.get(`${BASE_URL}/api/invitations?status=ALL`, { headers });
    console.log('All status response:', JSON.stringify(allResponse.data, null, 2));
    
    // Test status=PENDING
    console.log('\n4. Testing list with status=PENDING...');
    const pendingResponse = await axios.get(`${BASE_URL}/api/invitations?status=PENDING`, { headers });
    console.log('Pending status response:', JSON.stringify(pendingResponse.data, null, 2));
    
    // Test with explicit pagination
    console.log('\n5. Testing with pagination parameters...');
    const paginatedResponse = await axios.get(`${BASE_URL}/api/invitations?page=1&pageSize=20`, { headers });
    console.log('Paginated response:', JSON.stringify(paginatedResponse.data, null, 2));
    
    console.log('\n✅ Invitation list tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      if (error.response.status === 429) {
        console.log('Note: Rate limiting is active - this is expected behavior for invitation creation');
      }
    }
    process.exit(1);
  }
}

testInvitationListOnly();
