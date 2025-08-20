#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'http://localhost:8787';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

function hiddenQuestion(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let input = '';
    const onData = (char) => {
      if (char === '\u0003') { // Ctrl+C
        process.exit();
      } else if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else {
        input += char;
        process.stdout.write('*');
      }
    };
    
    process.stdin.on('data', onData);
  });
}

async function inviteUser() {
  console.log('=== LeamSP User Invitation Script ===\n');
  
  try {
    // Get invitation details
    const email = await question('Enter email to invite: ');
    if (!email) {
      console.log('❌ Email is required');
      process.exit(1);
    }
    
    const role = await question('Enter role (USER/ADMIN) [default: USER]: ') || 'USER';
    const message = await question('Enter invitation message [optional]: ') || 'Welcome to our platform!';
    
    console.log(`\n📧 Inviting: ${email}`);
    console.log(`👤 Role: ${role}`);
    console.log(`💬 Message: ${message}\n`);
    
    // Get admin credentials
    console.log('Admin credentials required:');
    const adminEmail = await question('Admin email: ');
    const adminPassword = await hiddenQuestion('Admin password: ');
    
    if (!adminEmail || !adminPassword) {
      console.log('❌ Admin credentials are required');
      process.exit(1);
    }
    
    // Step 1: Login
    console.log('\n🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful!');
    
    // Step 2: Send invitation
    console.log('📤 Sending invitation...');
    const inviteResponse = await axios.post(`${BASE_URL}/api/invitations`, {
      email: email,
      role: role,
      message: message
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Invitation sent successfully!');
    console.log('Response:', JSON.stringify(inviteResponse.data, null, 2));
    
    // Show next steps
    console.log('\n📋 Next Steps:');
    console.log(`1. The user will receive an invitation at ${email}`);
    console.log('2. They can accept the invitation using the provided token');
    console.log('3. Or you can check the invitation status in /api/invitations');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      console.log('\n⏰ Rate Limit: You can only send 5 invitations per 15 minutes.');
      console.log('Please wait and try again later.');
    } else if (error.response?.status === 401) {
      console.log('\n🔒 Authentication failed. Please check your admin credentials.');
    } else if (error.response?.status === 400) {
      const errorMsg = error.response.data.error;
      if (errorMsg === 'User already exists') {
        console.log('\n👤 This user is already registered in the system.');
      } else if (errorMsg === 'Pending invitation exists') {
        console.log('\n📧 This user already has a pending invitation.');
      }
    }
  } finally {
    rl.close();
  }
}

// Run the script
inviteUser();
