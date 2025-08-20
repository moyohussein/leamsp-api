-- Migration to fix the updatedAt format in the users table
-- Convert the existing updatedAt values to ISO 8601 format

-- First, create a backup of the current data
CREATE TABLE users_backup AS SELECT * FROM users;

-- Update the updatedAt column to use ISO 8601 format
UPDATE users SET 
  updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', updatedAt, 'utc')
WHERE 
  updatedAt IS NOT NULL AND 
  updatedAt NOT LIKE '%-%T%:%:%Z';

-- If the above doesn't work, try a more direct approach
-- This will handle the specific format we're seeing in the error
UPDATE users SET
  updatedAt = strftime(
    '%Y-%m-%dT%H:%M:%fZ',
    substr(updatedAt, 1, 4) || '-' ||
    substr(updatedAt, 6, 2) || '-' ||
    substr(updatedAt, 9, 5) ||
    substr(updatedAt, 14, 4) ||
    substr(updatedAt, 18, 4) || 'Z'
  )
WHERE 
  updatedAt LIKE '____-__-__ __:__:__%';

-- For any remaining dates that might be in a different format
UPDATE users SET
  updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE 
  updatedAt IS NULL OR 
  updatedAt = '' OR
  updatedAt NOT LIKE '____-__-__%';

-- Verify the changes
SELECT id, email, updatedAt FROM users LIMIT 5;
