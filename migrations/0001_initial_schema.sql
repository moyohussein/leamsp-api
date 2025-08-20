-- Create users table
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailVerified" DATETIME,
    "deletedAt" DATETIME
);

-- Create tokens table
CREATE TABLE "tokens" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Create index on userId for tokens table
CREATE INDEX "tokens_userId_idx" ON "tokens" ("userId");

-- Create id_cards table
CREATE TABLE "id_cards" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "display_name" TEXT NOT NULL,
  "attributes" TEXT NOT NULL,
  "image_url" TEXT,
  "public_id" TEXT,
  "member_since" DATETIME,
  "date_of_generation" DATETIME,
  "valid_until" DATETIME,
  "member_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "id_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Create index on userId for id_cards table
CREATE INDEX "id_cards_user_id_idx" ON "id_cards" ("user_id");

-- Create videos table
CREATE TABLE "videos" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "duration" INTEGER DEFAULT 0,
  "size" INTEGER,
  "mime_type" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "public_id" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT FALSE,
  "user_id" INTEGER NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  "deleted_at" DATETIME,
  CONSTRAINT "videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- Create indexes for videos table
CREATE INDEX "videos_user_id_idx" ON "videos" ("user_id");
CREATE INDEX "videos_is_public_idx" ON "videos" ("is_public");
