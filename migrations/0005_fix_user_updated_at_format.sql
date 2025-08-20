-- Fix the updatedAt format in the users table to be compatible with Prisma
-- First, add a temporary column to store the fixed timestamps
ALTER TABLE users ADD COLUMN updated_at_temp TIMESTAMP;

-- Convert the existing updatedAt values to the correct format
UPDATE users SET updated_at_temp = datetime(updatedAt) WHERE updatedAt IS NOT NULL;

-- Drop the old column
ALTER TABLE users DROP COLUMN updatedAt;

-- Rename the temporary column to updatedAt
ALTER TABLE users RENAME COLUMN updated_at_temp TO updatedAt;

-- Add the NOT NULL constraint and default value
ALTER TABLE users ALTER COLUMN updatedAt SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ALTER COLUMN updatedAt SET NOT NULL;
