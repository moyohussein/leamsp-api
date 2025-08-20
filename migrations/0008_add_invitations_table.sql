-- Migration number: 0008 	 2025-08-20T17:46:05.239Z

-- CreateTable
CREATE TABLE "invitations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inviter_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "accepted_at" DATETIME,
    "accepted_user_id" INTEGER,
    CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invitations_accepted_user_id_fkey" FOREIGN KEY ("accepted_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_email_key" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "invitations"("status");

-- CreateIndex
CREATE INDEX "invitations_inviter_id_idx" ON "invitations"("inviter_id");

-- CreateIndex
CREATE INDEX "invitations_accepted_user_id_idx" ON "invitations"("accepted_user_id");
