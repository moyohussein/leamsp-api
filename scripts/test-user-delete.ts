import { Hono } from 'hono';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from './test-utils';

describe('User Deletion Endpoint', () => {
  let app: Hono;
  let adminToken: string;
  let testUserId: number;
  let testUserToken: string;

  beforeAll(async () => {
    // Initialize test client and get admin token
    const { app: testApp, adminToken: token } = await createTestClient();
    app = testApp;
    adminToken = token;

    // Create a test user
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User Delete',
        email: 'test-delete@example.com',
        password: 'Test123!',
        password_confirmation: 'Test123!'
      })
    });
    
    if (!res.ok) {
      throw new Error(`Failed to create test user: ${await res.text()}`);
    }
    
    const userData = await res.json();
    testUserId = userData.data.user.id;
    
    // Login to get token
    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test-delete@example.com',
        password: 'Test123!'
      })
    });
    
    const loginData = await loginRes.json();
    testUserToken = loginData.data.token;
  });

  it('should delete a user (admin)', async () => {
    const res = await app.request(`/api/users/${testUserId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('User deleted successfully');
    expect(data.data).toHaveProperty('id', testUserId);
    expect(data.data).toHaveProperty('email', 'test-delete@example.com');
  });

  it('should return 403 when trying to delete own account', async () => {
    // Create another test user
    const resCreate = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Self Delete',
        email: 'test-selfdelete@example.com',
        password: 'Test123!',
        password_confirmation: 'Test123!'
      })
    });
    
    const userData = await resCreate.json();
    const userId = userData.data.user.id;
    
    // Try to delete self
    const res = await app.request(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userData.data.token}`,
        'Content-Type': 'application/json'
      }
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.message).toBe('Cannot delete your own account');
    
    // Cleanup
    await app.request(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
  });

  it('should return 404 for non-existent user', async () => {
    const nonExistentId = 999999;
    const res = await app.request(`/api/users/${nonExistentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.message).toBe('User not found');
  });

  it('should return 401 for unauthenticated requests', async () => {
    const res = await app.request(`/api/users/1`, {
      method: 'DELETE'
    });

    expect(res.status).toBe(401);
  });

  it('should return 403 for non-admin users', async () => {
    // Create a regular user
    const resCreate = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Regular User',
        email: 'test-regular@example.com',
        password: 'Test123!',
        password_confirmation: 'Test123!'
      })
    });
    
    const userData = await resCreate.json();
    const regularUserToken = userData.data.token;
    
    // Try to delete another user
    const res = await app.request(`/api/users/1`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${regularUserToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(res.status).toBe(403);
    
    // Cleanup
    await app.request(`/api/users/${userData.data.user.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
  });
});
