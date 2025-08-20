#!/bin/bash
set -e

BASE_URL="https://leamsp-api.attendance.workers.dev"
EMAIL="aqmhussein+60@gmail.com"
PASSWORD="Password@123"

GREEN='\\033[0;32m'
RED='\\033[0;31m'
NC='\\033[0m'

echo -e "${GREEN}=== Testing Login Endpoint (Production) ===${NC}"

# Logging in
echo -e "Logging in with email: $EMAIL..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$EMAIL"'","password":"'"$PASSWORD"'"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token' 2>/dev/null || echo "")
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}Login failed. Response:${NC}"
  echo "$LOGIN_RESPONSE" | jq . || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}Login successful! Token obtained.${NC}"

# Fetch profile to verify auth works
echo -e "Fetching profile to verify auth works..."
PROFILE=$(curl -s "$BASE_URL/user/profile" -H "Authorization: Bearer $TOKEN")
if ! echo "$PROFILE" | grep -q '"success":true'; then
  echo -e "${RED}Profile fetch failed:${NC}"
  echo "$PROFILE" | jq . || echo "$PROFILE"
  exit 1
fi

echo -e "${GREEN}Profile response:${NC}"
echo "$PROFILE" | jq . || echo "$PROFILE"

echo -e "${GREEN}✅ Login test completed successfully${NC}"
