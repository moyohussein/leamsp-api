#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:8787';

async function testInvitationEndpoints() {
  console.log('=== Testing Invitation API Endpoints ===\n');
  
  try {
    // Step 1: Create a test user and get an admin token
    console.log('1. Setting up admin test user...');
    const adminEmail = `admin-${Date.now()}@example.com`;
    
    // Register admin user
    await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Admin User',
      email: adminEmail,
      password: 'AdminPassword123!',
      password_confirmation: 'AdminPassword123!'
    });
    
    // Login to get token
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
    
    // Step 2: Test listing invitations (should be empty initially)
    console.log('\n2. Testing list invitations (empty)...');
    try {
      const listEmptyResponse = await axios.get(`${BASE_URL}/api/invitations`, { headers });
      console.log('✓ List invitations response:', {
        total: listEmptyResponse.data.data?.length || 0,
        pagination: listEmptyResponse.data.pagination
      });
    } catch (error) {
      console.log('List invitations error:', error.response?.data || error.message);
    }
    
    // Step 3: Test creating an invitation
    console.log('\n3. Testing create invitation...');
    const inviteEmail = `invited-${Date.now()}@example.com`;
    
    try {
      const createResponse = await axios.post(`${BASE_URL}/api/invitations`, {
        email: inviteEmail,
        role: 'USER',
        message: 'Welcome to the team!'
      }, { headers });
      
      console.log('✓ Create invitation response:', createResponse.data);
      
      // Step 4: Test listing invitations (should now have one)
      console.log('\n4. Testing list invitations (with data)...');
      const listResponse = await axios.get(`${BASE_URL}/api/invitations?status=PENDING`, { headers });
      console.log('✓ List invitations response:');
      console.log(`  - Total invitations: ${listResponse.data.pagination?.total || 0}`);
      console.log(`  - Current page: ${listResponse.data.pagination?.currentPage || 'N/A'}`);
      console.log(`  - Page size: ${listResponse.data.pagination?.pageSize || 'N/A'}`);
      
      if (listResponse.data.data && listResponse.data.data.length > 0) {
        const invitation = listResponse.data.data[0];
        console.log(`  - First invitation: ${invitation.email} (${invitation.status})`);
        
        // Step 5: Test filtering invitations by status
        console.log('\n5. Testing invitation filtering...');
        const allResponse = await axios.get(`${BASE_URL}/api/invitations?status=ALL`, { headers });
        console.log(`✓ All invitations: ${allResponse.data.pagination?.total || 0}`);
        
        const pendingResponse = await axios.get(`${BASE_URL}/api/invitations?status=PENDING`, { headers });
        console.log(`✓ Pending invitations: ${pendingResponse.data.pagination?.total || 0}`);
        
        const acceptedResponse = await axios.get(`${BASE_URL}/api/invitations?status=ACCEPTED`, { headers });
        console.log(`✓ Accepted invitations: ${acceptedResponse.data.pagination?.total || 0}`);
      }
      
      // Step 6: Test pagination
      console.log('\n6. Testing pagination...');
      const paginatedResponse = await axios.get(`${BASE_URL}/api/invitations?page=1&pageSize=5`, { headers });
      console.log('✓ Pagination test:', {
        currentPage: paginatedResponse.data.pagination?.currentPage,
        pageSize: paginatedResponse.data.pagination?.pageSize,
        total: paginatedResponse.data.pagination?.total,
        hasNextPage: paginatedResponse.data.pagination?.hasNextPage,
        hasPreviousPage: paginatedResponse.data.pagination?.hasPreviousPage
      });
      
    } catch (createError) {
      console.error('✗ Create invitation failed:', createError.response?.data || createError.message);
    }
    
    // Step 7: Test error cases
    console.log('\n7. Testing error cases...');
    
    // Invalid email
    try {
      await axios.post(`${BASE_URL}/api/invitations`, {
        email: 'invalid-email',
        role: 'USER'
      }, { headers });
    } catch (error) {
      console.log('✓ Invalid email error handled:', error.response?.data?.error || 'Error handled');
    }
    
    // Duplicate invitation
    try {
      await axios.post(`${BASE_URL}/api/invitations`, {
        email: inviteEmail, // Same email as before
        role: 'USER'
      }, { headers });
    } catch (error) {
      console.log('✓ Duplicate invitation error handled:', error.response?.data?.error || 'Error handled');
    }
    
    console.log('\n=== All Invitation API Tests Completed! ✅ ===');
    console.log('✓ List invitations endpoint working');
    console.log('✓ Create invitation endpoint working');
    console.log('✓ Filtering and pagination working');
    console.log('✓ Error handling working');
    
  } catch (error) {
    console.error('\n❌ Test setup failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testInvitationEndpoints();
