-- Create admin user for production database
-- Run with: wrangler d1 execute leamsp-db --remote --file scripts/create-admin.sql

-- First, check if user exists
INSERT INTO users (email, name, password, role, emailVerified, createdAt, updatedAt)
SELECT 
  'aqmhussein@gmail.com',
  'Aqm Hussein',
  '$2b$10$X7VZL8kKJH9QJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
  'ADMIN',
  datetime('now'),
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'aqmhussein@gmail.com'
);

-- Update existing user to admin if they exist
UPDATE users 
SET role = 'ADMIN', 
    emailVerified = datetime('now'),
    password = '$2b$10$X7VZL8kKJH9QJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z'
WHERE email = 'aqmhussein@gmail.com';

-- Verify the user was created/updated
SELECT id, email, name, role, emailVerified FROM users WHERE email = 'aqmhussein@gmail.com';
