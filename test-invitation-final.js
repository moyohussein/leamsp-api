#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:8787';

async function testInvitationEndpoints() {
  console.log('=== Complete Invitation API Test ===\n');
  
  try {
    // Create a fresh admin user
    console.log('1. Creating fresh admin user...');
    const adminEmail = `admin-${Date.now()}@example.com`;
    
    await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Admin User',
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
    
    // Test list invitations (empty initially)
    console.log('\n2. Testing list invitations (should be empty)...');
    const emptyResponse = await axios.get(`${BASE_URL}/api/invitations`, { headers });
    console.log('Empty list response:', JSON.stringify(emptyResponse.data, null, 2));
    
    // Create an invitation
    console.log('\n3. Creating an invitation...');
    const inviteEmail = `invited-${Date.now()}@example.com`;
    const createResponse = await axios.post(`${BASE_URL}/api/invitations`, {
      email: inviteEmail,
      role: 'USER',
      message: 'Welcome to our platform!'
    }, { headers });
    
    console.log('Create invitation response:', JSON.stringify(createResponse.data, null, 2));
    
    // Test list invitations after creation
    console.log('\n4. Testing list invitations (after creation)...');
    const listResponse = await axios.get(`${BASE_URL}/api/invitations`, { headers });
    console.log('List after creation:', JSON.stringify(listResponse.data, null, 2));
    
    // Test different status filters
    console.log('\n5. Testing status filters...');
    const allResponse = await axios.get(`${BASE_URL}/api/invitations?status=ALL`, { headers });
    console.log('All invitations:', JSON.stringify(allResponse.data, null, 2));
    
    const pendingResponse = await axios.get(`${BASE_URL}/api/invitations?status=PENDING`, { headers });
    console.log('Pending invitations:', JSON.stringify(pendingResponse.data, null, 2));
    
    // Test pagination
    console.log('\n6. Testing pagination...');
    const pageResponse = await axios.get(`${BASE_URL}/api/invitations?page=1&pageSize=5`, { headers });
    console.log('Paginated response:', JSON.stringify(pageResponse.data, null, 2));
    
    console.log('\n✅ All invitation API tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    process.exit(1);
  }
}

testInvitationEndpoints();
