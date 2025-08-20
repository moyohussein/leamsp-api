-- Add created_at column to tokens table
ALTER TABLE tokens ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
