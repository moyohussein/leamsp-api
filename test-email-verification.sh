#!/bin/bash
set -e

# Get the token from the registration response or login response
# For testing, we'll use the token from the login response
TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <jwt_token>"
  echo "Example: $0 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  exit 1
fi

# Base URL for production
BASE_URL="https://leamsp-api.attendance.workers.dev"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Testing Email Verification ===${NC}"

# Test email verification
echo -e "\n1. Requesting email verification..."
VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/verify-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"test-1755096657@example.com"}' || echo "error")

if [ "$VERIFY_RESPONSE" = "error" ]; then
  echo -e "${RED}❌ Failed to connect to the server${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Server response:${NC}"
echo "$VERIFY_RESPONSE" | jq .

# Check for success or specific error
echo -e "\n2. Checking response status..."
if echo "$VERIFY_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Email verification request successful!${NC}"
  echo -e "   Check your email for the verification link."
  
  # In development, the token might be in the response
  DEV_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.devToken // empty' 2>/dev/null)
  if [ -n "$DEV_TOKEN" ]; then
    echo -e "\n${GREEN}📧 Development token found (for testing):${NC}"
    echo "$DEV_TOKEN"
    
    # Test verifying the email with the token
    echo -e "\n3. Testing email verification with token..."
    VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/verify-email?token=$DEV_TOKEN" || echo "error")
    
    if [ "$VERIFY_RESPONSE" = "error" ]; then
      echo -e "${RED}❌ Failed to verify email${NC}"
      exit 1
    fi
    
    echo -e "${GREEN}✅ Email verification response:${NC}"
    echo "$VERIFY_RESPONSE"
  fi
else
  echo -e "${RED}❌ Email verification request failed:${NC}"
  echo "$VERIFY_RESPONSE" | jq '.message // .error // .'
fi
