#!/bin/bash

# Check if name and email are provided
if [ $# -lt 2 ]; then
  echo "Usage: $0 <name> <email>"
  echo "Example: $0 \"Admin User\" admin@example.com"
  exit 1
fi

NAME="$1"
EMAIL="$2"
DEFAULT_PASSWORD="password@123"

# Hash the password (using Node's built-in crypto module)
HASHED_PASSWORD=$(node -e "
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync('$DEFAULT_PASSWORD', salt, 1000, 64, 'sha512').toString('hex');
  console.log('$2a$10$' + salt + hash);
")

# Current timestamp in ISO format
CURRENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# SQL to insert or update admin user
SQL="
  INSERT INTO users (name, email, password, role, \"emailVerified\", \"createdAt\", \"updatedAt\")
  VALUES ('$NAME', '$EMAIL', '$HASHED_PASSWORD', 'ADMIN', '$CURRENT_TIMESTAMP', '$CURRENT_TIMESTAMP', '$CURRENT_TIMESTAMP')
  ON CONFLICT(email) DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = 'ADMIN',
    \"updatedAt\" = EXCLUDED.\"updatedAt\";
"

# Execute the SQL
npx wrangler d1 execute leamsp-db --env production --remote --command "$SQL"

# Verify the user was created/updated
npx wrangler d1 execute leamsp-db --env production --remote --command "
  SELECT id, name, email, role, \"emailVerified\" FROM users WHERE email = '$EMAIL';
"

echo ""
echo "✅ Admin user created/updated successfully!"
echo "Email: $EMAIL"
echo "Password: $DEFAULT_PASSWORD"
echo ""
echo "You can now log in at: https://leamsp-api.attendance.workers.dev/api/auth/login"
echo ""
