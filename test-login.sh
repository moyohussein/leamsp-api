#!/bin/bash

# Test login script to get JWT token
# Usage: ./test-login.sh <email> <password> [base_url]

set -e

EMAIL="$1"
PASSWORD="$2"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: $0 <email> <password>"
  echo "Example: $0 test@example.com yourpassword"
  exit 1
fi

# Base URL of the API (default to production if not provided)
BASE_URL="${3:-https://leamsp-api.attendance.workers.dev}"

# Make the login request
RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extract and display the token (enveloped under data)
TOKEN=$(echo "$RESPONSE" | jq -r '.data.token' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Login failed. Response:"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo "Login successful against ${BASE_URL}! Your JWT token is:"
echo "$TOKEN"

# Copy the token to clipboard if possible
if command -v xclip &> /dev/null; then
  echo -n "$TOKEN" | xclip -selection clipboard
  echo "Token has been copied to your clipboard!"
elif command -v pbcopy &> /dev/null; then
  echo -n "$TOKEN" | pbcopy
  echo "Token has been copied to your clipboard!"
fi
