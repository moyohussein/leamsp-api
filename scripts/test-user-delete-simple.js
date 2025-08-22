const { test } = require('node:test');
const assert = require('assert');
const { Hono } = require('hono');
const { app } = require('../dist/index.js');

// Helper function to make HTTP requests
async function makeRequest(method, path, token = null, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const init = { method, headers };
  if (body) init.body = JSON.stringify(body);
  
  return await app.request(path, init);
}

// Main test
(async () => {
  let adminToken = '';
  let testUserId = null;
  let testUserToken = '';
  
  try {
    // Test 1: Login as admin (assuming there's a default admin user)
    console.log('Test 1: Login as admin...');
    const loginRes = await makeRequest('POST', '/api/auth/login', null, {
      email: 'admin@example.com', // Update with your admin email
      password: 'admin123'        // Update with your admin password
    });
    
    assert.strictEqual(loginRes.status, 200, 'Admin login should succeed');
    const loginData = await loginRes.json();
    adminToken = loginData.data.token;
    console.log('✓ Admin login successful');
    
    // Test 2: Create a test user
    console.log('\nTest 2: Create test user...');
    const createRes = await makeRequest('POST', '/api/auth/register', null, {
      name: 'Test User Delete',
      email: 'test-delete@example.com',
      password: 'Test123!',
      password_confirmation: 'Test123!'
    });
    
    assert.strictEqual(createRes.status, 200, 'User creation should succeed');
    const userData = await createRes.json();
    testUserId = userData.data.user.id;
    console.log(`✓ Test user created with ID: ${testUserId}`);
    
    // Get test user token
    const testLoginRes = await makeRequest('POST', '/api/auth/login', null, {
      email: 'test-delete@example.com',
      password: 'Test123!'
    });
    const testLoginData = await testLoginRes.json();
    testUserToken = testLoginData.data.token;
    
    // Test 3: Try to delete user as non-admin (should fail)
    console.log('\nTest 3: Try to delete user as non-admin...');
    const nonAdminDeleteRes = await makeRequest(
      'DELETE', 
      `/api/users/1`, 
      testUserToken
    );
    assert.strictEqual(nonAdminDeleteRes.status, 403, 'Non-admin should not be able to delete users');
    console.log('✓ Non-admin user cannot delete other users');
    
    // Test 4: Try to delete non-existent user (should fail)
    console.log('\nTest 4: Try to delete non-existent user...');
    const nonExistentRes = await makeRequest(
      'DELETE', 
      '/api/users/999999', 
      adminToken
    );
    assert.strictEqual(nonExistentRes.status, 404, 'Should return 404 for non-existent user');
    console.log('✓ Non-existent user deletion fails with 404');
    
    // Test 5: Delete the test user (should succeed)
    console.log('\nTest 5: Delete test user as admin...');
    const deleteRes = await makeRequest(
      'DELETE', 
      `/api/users/${testUserId}`, 
      adminToken
    );
    
    assert.strictEqual(deleteRes.status, 200, 'Admin should be able to delete user');
    const deleteData = await deleteRes.json();
    assert.strictEqual(deleteData.message, 'User deleted successfully', 'Should return success message');
    assert.strictEqual(deleteData.data.id, testUserId, 'Should return deleted user ID');
    console.log('✓ Test user deleted successfully');
    
    // Test 6: Verify user is deleted
    console.log('\nTest 6: Verify user is deleted...');
    const verifyRes = await makeRequest('GET', `/api/users`, adminToken);
    const usersData = await verifyRes.json();
    const userStillExists = usersData.data.some(u => u.id === testUserId);
    assert.strictEqual(userStillExists, false, 'User should no longer exist');
    console.log('✓ User is no longer in the system');
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Cleanup: Try to delete test user if it was created
    if (testUserId && adminToken) {
      try {
        await makeRequest('DELETE', `/api/users/${testUserId}`, adminToken);
      } catch (e) {
        console.error('Cleanup failed:', e.message);
      }
    }
    
    process.exit(1);
  }
})();
