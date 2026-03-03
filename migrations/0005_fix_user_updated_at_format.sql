-- Fix the updatedAt format in the users table to be compatible with Prisma
-- SQLite-compatible migration

-- Create a new table with the correct schema
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'USER',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    emailVerified TIMESTAMP,
    deletedAt TIMESTAMP
);

-- Copy data from old table to new table
INSERT INTO users_new (id, email, name, password, image, role, createdAt, updatedAt, emailVerified, deletedAt)
SELECT id, email, name, password, image, role, createdAt, updatedAt, emailVerified, deletedAt
FROM users;

-- Drop old table
DROP TABLE users;

-- Rename new table to users
ALTER TABLE users_new RENAME TO users;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
