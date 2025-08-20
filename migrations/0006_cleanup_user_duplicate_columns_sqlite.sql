-- Migration to clean up duplicate columns in the users table using SQLite-compatible operations
-- This approach creates a new table with the correct schema and migrates the data

-- 1. Create a new table with the correct schema
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  emailVerified TEXT,
  deletedAt TEXT
);

-- 2. Copy data from the old table to the new one, preferring camelCase columns
INSERT INTO users_new (
  id, email, name, password, image, role, 
  createdAt, updatedAt, emailVerified, deletedAt
)
SELECT 
  id, email, name, password, image, role,
  COALESCE(createdAt, created_at, CURRENT_TIMESTAMP) as createdAt,
  COALESCE(updatedAt, updated_at, CURRENT_TIMESTAMP) as updatedAt,
  COALESCE(emailVerified, email_verified) as emailVerified,
  COALESCE(deletedAt, deleted_at) as deletedAt
FROM users;

-- 3. Drop the old table
DROP TABLE users;

-- 4. Rename the new table to the original name
ALTER TABLE users_new RENAME TO users;

-- 5. Recreate indexes
CREATE UNIQUE INDEX users_email_key ON users(email);

-- 6. Update any foreign key constraints that reference this table
-- Note: You may need to add additional statements here if there are foreign keys
-- referencing the users table that need to be recreated.
