import { sign } from 'jsonwebtoken';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

// Get JWT secret from environment variables or use a default for testing
const JWT_SECRET = process.env.JWT_SECRET || 'your_secure_jwt_secret_here';

// Create a test admin user payload
const adminPayload = {
  data: {
    id: '1',
    email: 'admin@example.com',
    role: 'ADMIN',
    name: 'Test Admin'
  }
};

// Generate JWT token
const token = sign(adminPayload, JWT_SECRET, { expiresIn: '1h' });

console.log('Test JWT Token:');
console.log(token);

// Instructions
console.log('\nUse this token in the Authorization header:');
console.log(`Authorization: Bearer ${token}`);

// Test curl command
console.log('\nTest command to list invitations:');
console.log(`curl -X GET "https://leamsp-api.attendance.workers.dev/api/invitations" \
  -H "Authorization: Bearer ${token}"`);
