-- Migration to clean up duplicate columns in the users table
-- Ensure all data is in the camelCase columns
UPDATE users SET 
  updatedAt = updated_at,
  createdAt = created_at,
  emailVerified = email_verified,
  deletedAt = deleted_at
WHERE 
  updated_at IS NOT NULL OR 
  created_at IS NOT NULL OR 
  email_verified IS NOT NULL OR 
  deleted_at IS NOT NULL;

-- Drop the snake_case columns
ALTER TABLE users DROP COLUMN updated_at;
ALTER TABLE users DROP COLUMN created_at;
ALTER TABLE users DROP COLUMN email_verified;
ALTER TABLE users DROP COLUMN deleted_at;

-- Ensure all required columns have proper constraints
ALTER TABLE users ALTER COLUMN updatedAt SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ALTER COLUMN updatedAt SET NOT NULL;
ALTER TABLE users ALTER COLUMN createdAt SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ALTER COLUMN createdAt SET NOT NULL;
