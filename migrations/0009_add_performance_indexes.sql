-- Migration to optimize database indexes for better performance
-- SQLite-compatible version with correct column names

-- Users table indexes
-- Email is already unique (creates index automatically)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_createdAt ON users("createdAt");
CREATE INDEX IF NOT EXISTS idx_users_emailVerified ON users("emailVerified");
-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, "createdAt");

-- Videos table indexes
-- userId and isPublic already indexed
CREATE INDEX IF NOT EXISTS idx_videos_createdAt ON videos("createdAt");
CREATE INDEX IF NOT EXISTS idx_videos_user_created ON videos("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_videos_public_created ON videos("isPublic", "createdAt");

-- Tokens table indexes
-- userId, type already indexed as composite
CREATE INDEX IF NOT EXISTS idx_tokens_expiresAt ON tokens("expiresAt");
CREATE INDEX IF NOT EXISTS idx_tokens_type_expires ON tokens(type, "expiresAt");
CREATE INDEX IF NOT EXISTS idx_tokens_usedAt ON tokens("usedAt");

-- IdCards table indexes
-- userId and memberId already indexed
CREATE INDEX IF NOT EXISTS idx_idcards_createdAt ON id_cards("createdAt");
CREATE INDEX IF NOT EXISTS idx_idcards_user_created ON id_cards("userId", "createdAt");

-- Invitations table indexes
-- email, token, status, inviterId, acceptedUserId already indexed
CREATE INDEX IF NOT EXISTS idx_invitations_createdAt ON invitations("createdAt");
CREATE INDEX IF NOT EXISTS idx_invitations_expiresAt ON invitations("expiresAt");
-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invitations_status_email ON invitations(status, email);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_status ON invitations("inviterId", status);

-- Verify indexes
SELECT name, tbl_name, sql 
FROM sqlite_master 
WHERE type='index' 
AND tbl_name IN ('users', 'videos', 'tokens', 'id_cards', 'invitations')
ORDER BY tbl_name, name;
