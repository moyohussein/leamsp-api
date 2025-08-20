#!/usr/bin/env node

const axios = require('axios');

async function testProfileVsUsers() {
  console.log('=== Testing Profile vs Users Endpoints ===\n');
  
  try {
    // Create a test user and get token
    const testEmail = `test-${Date.now()}@example.com`;
    
    console.log('1. Setting up test user...');
    await axios.post('http://localhost:8787/api/auth/register', {
      name: 'Profile Test User',
      email: testEmail,
      password: 'TestPassword123!',
      password_confirmation: 'TestPassword123!'
    });
    
    const loginResponse = await axios.post('http://localhost:8787/api/auth/login', {
      email: testEmail,
      password: 'TestPassword123!'
    });
    
    const token = loginResponse.data.data.token;
    const expectedUserId = loginResponse.data.data.user.id;
    
    console.log(`✓ Created test user with ID: ${expectedUserId}`);
    
    // Test profile endpoint
    console.log('\n2. Testing profile endpoint...');
    const profileResponse = await axios.get('http://localhost:8787/api/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const profileData = profileResponse.data.data;
    
    // Verify profile endpoint behavior
    if (!profileData.id || typeof profileData.id !== 'number') {
      throw new Error('Profile endpoint should return a single user with numeric ID');
    }
    
    if (profileData.id !== expectedUserId) {
      throw new Error(`Profile endpoint returned wrong user. Expected ID: ${expectedUserId}, Got: ${profileData.id}`);
    }
    
    if (profileData.email !== testEmail) {
      throw new Error(`Profile endpoint returned wrong email. Expected: ${testEmail}, Got: ${profileData.email}`);
    }
    
    if (Array.isArray(profileData)) {
      throw new Error('Profile endpoint should NOT return an array');
    }
    
    console.log('✓ Profile endpoint correctly returns authenticated user details');
    console.log(`  - User ID: ${profileData.id}`);
    console.log(`  - Email: ${profileData.email}`);
    console.log(`  - Name: ${profileData.name}`);
    console.log(`  - Role: ${profileData.role}`);
    
    // Test users endpoint
    console.log('\n3. Testing users endpoint...');
    const usersResponse = await axios.get('http://localhost:8787/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const usersData = usersResponse.data.data;
    
    // Verify users endpoint behavior
    if (!Array.isArray(usersData.data)) {
      throw new Error('Users endpoint should return an array of users in data.data');
    }
    
    if (!usersData.pagination) {
      throw new Error('Users endpoint should include pagination metadata');
    }
    
    if (usersData.data.length === 0) {
      throw new Error('Users endpoint should return at least one user');
    }
    
    // Check if our test user is in the list (should be first since it's newest)
    const ourUser = usersData.data.find(user => user.id === expectedUserId);
    if (!ourUser) {
      throw new Error('Our test user should be included in the users list');
    }
    
    console.log('✓ Users endpoint correctly returns array of users');
    console.log(`  - Total users: ${usersData.pagination.total}`);
    console.log(`  - Users in current page: ${usersData.data.length}`);
    console.log(`  - Current page: ${usersData.pagination.page}`);
    console.log(`  - Page size: ${usersData.pagination.pageSize}`);
    
    // Verify they return different data structures
    console.log('\n4. Verifying endpoints return different structures...');
    
    if (JSON.stringify(profileData) === JSON.stringify(usersData)) {
      throw new Error('Profile and Users endpoints should return different data structures');
    }
    
    console.log('✓ Profile and Users endpoints return appropriately different data');
    
    console.log('\n=== All Tests Passed! ✅ ===');
    console.log('✓ Profile endpoint returns authenticated user details (single object)');
    console.log('✓ Users endpoint returns array of users with pagination');
    console.log('✓ Both endpoints are working correctly and returning appropriate data');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testProfileVsUsers();
