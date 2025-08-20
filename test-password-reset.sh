#!/bin/bash
set -e

# Get the email to test password reset
EMAIL="$1"

if [ -z "$EMAIL" ]; then
  echo "Usage: $0 <email>"
  echo "Example: $0 test@example.com"
  exit 1
fi

# Base URL for production
BASE_URL="https://leamsp-api.attendance.workers.dev"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Testing Password Reset Flow ===${NC}"
echo -e "Using email: $EMAIL\n"

# 1. Request password reset
echo -e "1. Requesting password reset..."
RESET_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" || echo "error")

if [ "$RESET_RESPONSE" = "error" ]; then
  echo -e "${RED}❌ Failed to connect to the server${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Server response:${NC}"
echo "$RESET_RESPONSE" | jq .

# Check if we got a dev token (for testing)
DEV_TOKEN=$(echo "$RESET_RESPONSE" | jq -r '.devToken // empty' 2>/dev/null)

if [ -n "$DEV_TOKEN" ]; then
  echo -e "\n${GREEN}🔑 Development token received (for testing):${NC}"
  echo "$DEV_TOKEN"
  
  # 2. Test resetting the password with the token
  NEW_PASSWORD="NewSecurePass123!"
  echo -e "\n2. Testing password reset with token..."
  
  RESET_CONFIRM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/reset-password" \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$DEV_TOKEN\",\"newPassword\":\"$NEW_PASSWORD\",\"confirmPassword\":\"$NEW_PASSWORD\"}" || echo "error")
  
  if [ "$RESET_CONFIRM_RESPONSE" = "error" ]; then
    echo -e "${RED}❌ Failed to reset password${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Password reset response:${NC}"
  echo "$RESET_CONFIRM_RESPONSE" | jq .
  
  # 3. Test logging in with the new password
  echo -e "\n3. Testing login with new password..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$NEW_PASSWORD\"}" || echo "error")
  
  if [ "$LOGIN_RESPONSE" = "error" ]; then
    echo -e "${RED}❌ Failed to login with new password${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Login with new password successful:${NC}"
  echo "$LOGIN_RESPONSE" | jq .
  
  # Extract the new JWT token
  NEW_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty' 2>/dev/null)
  
  if [ -n "$NEW_TOKEN" ]; then
    echo -e "\n${GREEN}🔑 New JWT token:${NC}"
    echo "$NEW_TOKEN"
  fi
else
  echo -e "\n${GREEN}If an account exists with this email, a password reset link has been sent.${NC}"
  echo "In a production environment, you would check your email for the reset link."
fi
