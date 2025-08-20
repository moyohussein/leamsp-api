#!/bin/bash
set -e

BASE_URL="https://leamsp-api.attendance.workers.dev"
EMAIL="test-login-$(date +%s)@example.com"
PASSWORD="SecurePass123!"

GREEN='\\033[0;32m'
RED='\\033[0;31m'
NC='\\033[0m'

echo -e "${GREEN}=== Testing Login Endpoint (Production) ===${NC}"

# 1) Register user
echo -e "1) Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Login Tester","email":"'"$EMAIL"'","password":"'"$PASSWORD"'","password_confirmation":"'"$PASSWORD"'"}')
if ! echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${RED}Registration failed:${NC}"
  echo "$REGISTER_RESPONSE" | jq . || echo "$REGISTER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}Registered: $EMAIL${NC}"

# 2) Login
echo -e "2) Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$EMAIL"'","password":"'"$PASSWORD"'"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token' 2>/dev/null || echo "")
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}Login failed. Response:${NC}"
  echo "$LOGIN_RESPONSE" | jq . || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "$TOKEN" > .token

echo -e "${GREEN}Login successful! Token obtained.${NC}"
