#!/bin/bash
set -e

# Base URL for production
BASE_URL="http://localhost:8787"

# Generate a unique email for testing
EMAIL="test-$(date +%s)@example.com"
PASSWORD="SecurePass123!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Testing Registration Endpoint ===${NC}"
echo -e "Using base URL: $BASE_URL"

# Test registration
echo -e "\n1. Testing registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"password_confirmation\":\"$PASSWORD\"}" || echo "error")

if [ "$REGISTER_RESPONSE" = "error" ]; then
  echo -e "${RED}❌ Failed to connect to the server${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Server response:${NC}"
echo "$REGISTER_RESPONSE" | jq .

# Check for success or specific error
echo -e "\n2. Checking response status..."
if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Registration successful!${NC}"
elif echo "$REGISTER_RESPONSE" | grep -q '"success":false'; then
  echo -e "${RED}❌ Registration failed with error:${NC}"
  echo "$REGISTER_RESPONSE" | jq '.message // .error // .'
else
  echo -e "${RED}❌ Unexpected response format:${NC}"
  echo "$REGISTER_RESPONSE"
fi

# Test duplicate registration
echo -e "\n3. Testing duplicate registration..."
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"password_confirmation\":\"$PASSWORD\"}")

# Extract body and status code
DUPLICATE_BODY=$(echo "$DUPLICATE_RESPONSE" | head -n -1)
DUPLICATE_STATUS=$(echo "$DUPLICATE_RESPONSE" | tail -n 1)

echo -e "${GREEN}✅ Server response:${NC}"
echo "$DUPLICATE_BODY" | jq .
echo "Status code: $DUPLICATE_STATUS"

echo -e "\n4. Checking duplicate response status..."
if [ "$DUPLICATE_STATUS" -eq 409 ]; then
  echo -e "${GREEN}✅ Duplicate registration failed with 409 as expected!${NC}"
else
  echo -e "${RED}❌ Duplicate registration failed with unexpected status code: $DUPLICATE_STATUS${NC}"
  exit 1
fi
