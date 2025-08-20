#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:8787';

async function testInvitationList() {
  console.log('=== Testing Invitation List Endpoint ===\n');
  
  try {
    // Use an existing user (ID 68 from previous test)
    const adminEmail = `admin-1755712045@example.com`;
    
    // Login to get token
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: adminEmail,
      password: 'AdminPassword123!'
    });
    
    const adminToken = loginResponse.data.data.token;
    const adminUserId = loginResponse.data.data.user.id;
    console.log(`✓ Logged in as admin user with ID: ${adminUserId}`);
    
    const headers = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    
    // Test various list invitation endpoints
    console.log('\n1. Testing basic list invitations...');
    try {
      const basicResponse = await axios.get(`${BASE_URL}/api/invitations`, { headers });
      console.log('Basic list response:', JSON.stringify(basicResponse.data, null, 2));
    } catch (error) {
      console.log('Basic list error:', error.response?.data || error.message);
    }
    
    console.log('\n2. Testing list with status=ALL...');
    try {
      const allResponse = await axios.get(`${BASE_URL}/api/invitations?status=ALL`, { headers });
      console.log('All status response:', JSON.stringify(allResponse.data, null, 2));
    } catch (error) {
      console.log('All status error:', error.response?.data || error.message);
    }
    
    console.log('\n3. Testing list with status=PENDING...');
    try {
      const pendingResponse = await axios.get(`${BASE_URL}/api/invitations?status=PENDING`, { headers });
      console.log('Pending status response:', JSON.stringify(pendingResponse.data, null, 2));
    } catch (error) {
      console.log('Pending status error:', error.response?.data || error.message);
    }
    
    console.log('\n4. Testing pagination parameters...');
    try {
      const paginatedResponse = await axios.get(`${BASE_URL}/api/invitations?page=1&pageSize=10`, { headers });
      console.log('Paginated response:', JSON.stringify(paginatedResponse.data, null, 2));
    } catch (error) {
      console.log('Paginated error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Test setup failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testInvitationList();
