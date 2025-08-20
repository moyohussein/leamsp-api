-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
