#!/usr/bin/env node

const axios = require('axios');

async function debugEndpoints() {
  console.log('=== Debug: Examining API Endpoints ===\n');
  
  try {
    // Create a test user and get token
    const testEmail = `debug-${Date.now()}@example.com`;
    
    console.log('1. Creating test user...');
    await axios.post('http://localhost:8787/api/auth/register', {
      name: 'Debug User',
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
    console.log('\n2. Testing /api/profile endpoint...');
    try {
      const profileResponse = await axios.get('http://localhost:8787/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Profile Response Status:', profileResponse.status);
      console.log('Profile Response Data:');
      console.log(JSON.stringify(profileResponse.data, null, 2));
      console.log('Profile data type:', typeof profileResponse.data.data);
      console.log('Is Profile data an array?', Array.isArray(profileResponse.data.data));
      
    } catch (error) {
      console.error('Profile endpoint error:', error.response ? error.response.data : error.message);
    }
    
    // Test users endpoint
    console.log('\n3. Testing /api/users endpoint...');
    try {
      const usersResponse = await axios.get('http://localhost:8787/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Users Response Status:', usersResponse.status);
      console.log('Users Response Data:');
      console.log(JSON.stringify(usersResponse.data, null, 2));
      console.log('Users data type:', typeof usersResponse.data.data);
      console.log('Is Users data an array?', Array.isArray(usersResponse.data.data));
      
    } catch (error) {
      console.error('Users endpoint error:', error.response ? error.response.data : error.message);
    }
    
    // Test direct curl equivalents
    console.log('\n4. Testing with curl equivalent...');
    console.log(`Try these commands manually:`);
    console.log(`curl -X GET "http://localhost:8787/api/profile" -H "Authorization: Bearer ${token}"`);
    console.log(`curl -X GET "http://localhost:8787/api/users" -H "Authorization: Bearer ${token}"`);
    
  } catch (error) {
    console.error('Setup error:', error.response ? error.response.data : error.message);
  }
}

debugEndpoints();
