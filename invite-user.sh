#!/bin/bash

# Script to invite a user to LeamSP API
BASE_URL="http://localhost:8787"

echo "=== LeamSP User Invitation Script ==="
echo

# Check if email was provided as argument
if [ -z "$1" ]; then
    echo "Usage: $0 <email> [role] [message]"
    echo "Example: $0 john@example.com USER 'Welcome to our team!'"
    exit 1
fi

EMAIL="$1"
ROLE="${2:-USER}"  # Default to USER if not specified
MESSAGE="${3:-Welcome to the platform!}"  # Default message

echo "Email: $EMAIL"
echo "Role: $ROLE"
echo "Message: $MESSAGE"
echo

# Step 1: Login to get JWT token
echo "Step 1: Logging in to get JWT token..."
echo "Please provide your admin credentials:"
read -p "Email: " ADMIN_EMAIL
read -s -p "Password: " ADMIN_PASSWORD
echo

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Login failed. Response:"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi

echo "✅ Login successful!"
echo

# Step 2: Send invitation
echo "Step 2: Sending invitation to $EMAIL..."

INVITE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/invitations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"$EMAIL\",
    \"role\": \"$ROLE\",
    \"message\": \"$MESSAGE\"
  }")

# Check if invitation was successful
SUCCESS=$(echo "$INVITE_RESPONSE" | jq -r '.success // false')

if [ "$SUCCESS" = "true" ]; then
    echo "✅ Invitation sent successfully!"
    echo "$INVITE_RESPONSE" | jq '.data'
    
    # Show token for testing (in development only)
    echo
    echo "📧 In development mode, you can use this token for testing:"
    echo "   Check your local database or logs for the invitation token"
else
    echo "❌ Invitation failed. Response:"
    echo "$INVITE_RESPONSE" | jq '.'
    
    # Check for rate limiting
    if echo "$INVITE_RESPONSE" | grep -q "Too many requests"; then
        echo
        echo "Note: You may have hit the rate limit (5 invitations per 15 minutes)"
        echo "Please wait and try again later."
    fi
fi
