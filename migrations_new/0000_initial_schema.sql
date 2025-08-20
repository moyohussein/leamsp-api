-- This migration is idempotent and safe to run multiple times

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Add any additional tables that should be part of the initial schema
-- For example, if you have other tables that should be created initially, add them here
-- CREATE TABLE IF NOT EXISTS ...
