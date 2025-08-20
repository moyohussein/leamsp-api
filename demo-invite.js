#!/usr/bin/env node

// Demo script to show invitation process
const axios = require('axios');

const BASE_URL = 'http://localhost:8787';

async function demoInvite() {
  console.log('=== Demo: How to Invite a User ===\n');
  
  try {
    // Create a demo admin user first
    console.log('1. Creating demo admin user...');
    const adminEmail = `demo-admin-${Date.now()}@example.com`;
    
    await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Demo Admin',
      email: adminEmail,
      password: 'DemoAdmin123!',
      password_confirmation: 'DemoAdmin123!'
    });
    
    // Login to get token
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: adminEmail,
      password: 'DemoAdmin123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Admin user created and logged in');
    
    // Send invitation
    console.log('\n2. Sending invitation...');
    const inviteEmail = `invited-user-${Date.now()}@example.com`;
    
    const inviteResponse = await axios.post(`${BASE_URL}/api/invitations`, {
      email: inviteEmail,
      role: 'USER',
      message: 'Welcome to LeamSP! You have been invited to join our platform.'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Invitation sent successfully!');
    console.log('Invitation details:', JSON.stringify(inviteResponse.data, null, 2));
    
    // List invitations
    console.log('\n3. Checking invitation list...');
    const listResponse = await axios.get(`${BASE_URL}/api/invitations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Current invitations:', JSON.stringify(listResponse.data, null, 2));
    
    console.log('\n📋 Summary:');
    console.log(`• Admin email: ${adminEmail}`);
    console.log(`• Invited email: ${inviteEmail}`);
    console.log(`• Invitation ID: ${inviteResponse.data.data.id}`);
    console.log(`• Status: PENDING`);
    console.log('\n💡 The invited user can now accept the invitation using the token from the database.');
    
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('⏰ Rate limit reached. Please wait 15 minutes and try again.');
    } else {
      console.error('❌ Demo failed:', error.response?.data || error.message);
    }
  }
}

demoInvite();
