#!/bin/bash
set -e

# Get the JWT token from command line argument
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

echo -e "${GREEN}=== Testing Profile Fetch ===${NC}"

# Test fetching the user profile
echo -e "\n1. Fetching user profile..."
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" || echo "error")

if [ "$PROFILE_RESPONSE" = "error" ]; then
  echo -e "${RED}❌ Failed to connect to the server${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Server response:${NC}"
echo "$PROFILE_RESPONSE" | jq .

# Check for success or specific error
echo -e "\n2. Checking response status..."
if echo "$PROFILE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Profile fetch successful!${NC}"
  
  # Extract and display user info
  USER_EMAIL=$(echo "$PROFILE_RESPONSE" | jq -r '.data.email // empty' 2>/dev/null)
  USER_NAME=$(echo "$PROFILE_RESPONSE" | jq -r '.data.name // empty' 2>/dev/null)
  USER_ROLE=$(echo "$PROFILE_RESPONSE" | jq -r '.data.role // empty' 2>/dev/null)
  USER_IMAGE=$(echo "$PROFILE_RESPONSE" | jq -r '.data.image // empty' 2>/dev/null)
  USER_IMAGE_URL=$(echo "$PROFILE_RESPONSE" | jq -r '.data.imageUrl // empty' 2>/dev/null)
  
  if [ -n "$USER_EMAIL" ]; then
    echo -e "\n${GREEN}👤 User Information:${NC}"
    echo -e "ID: $(echo "$PROFILE_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)"
    echo -e "Email: $USER_EMAIL"
    echo -e "Name: $USER_NAME"
    echo -e "Role: $USER_ROLE"
    echo -e "Image: ${USER_IMAGE:-N/A}"
    echo -e "Image URL: ${USER_IMAGE_URL:-N/A}"
    
    # Check if image and imageUrl are present and match
    if [ -n "$USER_IMAGE" ] && [ -n "$USER_IMAGE_URL" ] && [ "$USER_IMAGE" != "$USER_IMAGE_URL" ]; then
      echo -e "${YELLOW}⚠️  Warning: image and imageUrl fields do not match${NC}"
    fi
  fi
else
  echo -e "${RED}❌ Profile fetch failed:${NC}"
  echo "$PROFILE_RESPONSE" | jq '.message // .error // .'
  
  # Check for specific error messages
  if echo "$PROFILE_RESPONSE" | grep -q 'jwt expired'; then
    echo -e "\n${RED}⚠️  The token has expired. Please log in again to get a new token.${NC}"
  elif echo "$PROFILE_RESPONSE" | grep -q 'jwt malformed'; then
    echo -e "\n${RED}⚠️  Invalid token format. Please provide a valid JWT token.${NC}"
  elif echo "$PROFILE_RESPONSE" | grep -q 'invalid token'; then
    echo -e "\n${RED}⚠️  Invalid token. The token might be corrupted or tampered with.${NC}"
  fi
fi
