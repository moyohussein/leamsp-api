#!/bin/bash
set -e

# Configuration
BASE_URL="http://localhost:8787"  # Default local development URL
EMAIL="test-$(date +%s)@example.com"  # Generate a unique email
PASSWORD="SecurePass123!"
DISPLAY_NAME="Test User $(date +%s)"

# Debug function
debug() {
  echo "[DEBUG] $1"
}

# Error function
error() {
  echo "[ERROR] $1" >&2
  exit 1
}

# Make sure jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq first."
    exit 1
fi

echo "=== Testing ID Card Generation Endpoint ==="

# 1. Register a test user
echo -e "\n1. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$DISPLAY_NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"password_confirmation\":\"$PASSWORD\"}" || echo "error")

if [ "$REGISTER_RESPONSE" = "error" ]; then
  echo "❌ Failed to register user (server might be down)"
  exit 1
fi

echo "✅ User registered: $EMAIL"

# 2. Log in to get JWT
echo -e "\n2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data?.token' 2>/dev/null || echo "")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in. Token obtained."

# 3. Get user ID first
debug "Getting user ID for email: $EMAIL"
USER_RESPONSE=$(wrangler d1 execute leamsp-db --command="
  SELECT id, email FROM users WHERE email = '$EMAIL';
" --local --json)

debug "User query response: $USER_RESPONSE"

# Extract user ID from the response
USER_ID=$(echo "$USER_RESPONSE" | jq -r '.[0].results[0].id // empty')

if [ -z "$USER_ID" ]; then
  error "Failed to get user ID for email: $EMAIL"
fi

debug "Found user ID: $USER_ID"

# 4. Clean up the database and create a verification token
echo -e "\n4. Cleaning up and creating verification token..."

# First, let's make sure we have a clean tokens table with the correct schema
echo "Ensuring clean tokens table with correct schema..."
wrangler d1 execute leamsp-db --command="
  -- Drop the existing tokens table if it exists
  DROP TABLE IF EXISTS tokens;
  
  -- Create a new tokens table with the correct schema
  CREATE TABLE tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    type TEXT NOT NULL,
    tokenHash TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    usedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
  );
  
  -- Create necessary indexes
  CREATE INDEX IF NOT EXISTS tokens_userId_type_idx ON tokens (userId, type);
" --local --json

# Now create a new token with the correct schema
echo "Creating new token with correct schema..."
CURRENT_TIMESTAMP=$(date +%s)
TOKEN_HASH="test_token_hash_$CURRENT_TIMESTAMP"

# Now create a new token with the correct schema
echo "Creating new token with correct schema..."
TOKEN_RESPONSE=$(wrangler d1 execute leamsp-db --command="
  INSERT INTO tokens (userId, type, tokenHash, expiresAt, createdAt)
  VALUES (
    $USER_ID,
    'idcard',
    '$TOKEN_HASH',
    datetime('now', '+10 minutes'),
    datetime('now')
  )
  RETURNING id, userId, type, tokenHash, expiresAt, usedAt, createdAt;
" --local --json)

debug "Token creation response: $TOKEN_RESPONSE"

# Check if token was created successfully
TOKEN_ID=$(echo "$TOKEN_RESPONSE" | jq -r '.[0].results[0]?.id // empty')
if [ -z "$TOKEN_ID" ]; then
  error "Failed to create token. Response: $TOKEN_RESPONSE"
fi

echo "✅ Token created successfully with ID: $TOKEN_ID"

# 5. Generate an ID card
echo -e "\n5. Generating ID card..."
GENERATE_RESPONSE=$(curl -v -s -X POST "$BASE_URL/api/id-card/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\":\"$DISPLAY_NAME\"}" 2>&1)

# Print the raw response for debugging
echo -e "\nResponse from /api/id-card/generate:"
echo "$GENERATE_RESPONSE"

# Extract and display the HTTP status code
HTTP_STATUS=$(echo "$GENERATE_RESPONSE" | grep -i "< HTTP/" | tail -1 | awk '{print $3}')
echo -e "\nHTTP Status: ${HTTP_STATUS:-Unknown}"

# If the response is not valid JSON, show the full response
if ! jq -e . >/dev/null 2>&1 <<<"$GENERATE_RESPONSE"; then
  echo -e "\nError: Invalid JSON response. Full response:"
  echo "$GENERATE_RESPONSE"
  exit 1
fi

# Pretty print the response
echo -e "\nResponse from /api/id-card/generate:"
echo "$GENERATE_RESPONSE" | jq .

# Check if generation was successful
CARD_ID=$(echo "$GENERATE_RESPONSE" | jq -r '.data?.id' 2>/dev/null || echo "")
if [ -z "$CARD_ID" ] || [ "$CARD_ID" = "null" ]; then
  echo "❌ Failed to generate ID card."
  exit 1
fi

echo -e "\n✅ ID Card generated successfully!"
echo "Card ID: $CARD_ID"

# 4. Get the card details
echo -e "\n4. Fetching card details..."
CARD_DETAILS=$(curl -s -X GET "$BASE_URL/api/id-card/$CARD_ID" \
  -H "Authorization: Bearer $TOKEN")

echo -e "\nCard Details:"
echo "$CARD_DETAILS" | jq .

echo -e "\n✅ Test completed successfully!"
exit 0
