-- Add expires_at column to tokens table
ALTER TABLE tokens ADD COLUMN expires_at DATETIME;
