#!/bin/bash
set -e

# Base URL for production
BASE_URL="https://leamsp-api.attendance.workers.dev"

# Generate a unique email for testing
EMAIL="test-$(date +%s)@example.com"
PASSWORD="SecurePass123!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Testing Upload Endpoint in Production ===${NC}"

# 1. Register a test user
echo -e "\n1. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"password_confirmation\":\"$PASSWORD\"}" || echo "error")

if [ "$REGISTER_RESPONSE" = "error" ]; then
  echo -e "${RED}❌ Failed to register user (server might be down)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ User registered: $EMAIL${NC}"

# 2. Log in to get JWT
echo -e "\n2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data?.token' 2>/dev/null || echo "")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Login failed. Response:${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Logged in. Token obtained.${NC}"

# 3. Test file upload
echo -e "\n3. Testing file upload..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@cuisine-005.jpg" \
  -F "type=profile")

if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Upload successful!${NC}"
  echo "Response:"
  echo "$UPLOAD_RESPONSE" | jq .
else
  echo -e "${RED}❌ Upload failed. Response:${NC}"
  echo "$UPLOAD_RESPONSE" | jq .
  exit 1
fi

echo -e "\n${GREEN}✅ Test completed successfully!${NC}"
