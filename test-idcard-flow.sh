#!/bin/bash
set -e

BASE_URL="http://localhost:39413"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="SecurePass123!"

echo "=== Testing ID Card Generation Flow ==="

# 1. Register a test user
echo -e "\n1. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"password_confirmation\":\"$PASSWORD\"}" || echo "error")

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

# 3. Create an ID card
echo -e "\n3. Creating ID card..."
CREATE_CARD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/id-card" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test ID Card","attributes":{"department":"Testing"}}')

CARD_ID=$(echo "$CREATE_CARD_RESPONSE" | jq -r '.data?.id' 2>/dev/null || echo "")

if [ -z "$CARD_ID" ] || [ "$CARD_ID" = "null" ]; then
  echo "❌ Failed to create ID card. Response:"
  echo "$CREATE_CARD_RESPONSE"
  exit 1
fi

echo "✅ ID Card created with ID: $CARD_ID"

# 4. Generate ID card details
echo -e "\n4. Generating ID card details..."
GENERATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/id-card/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"cardId\": $CARD_ID}")

VERIFY_TOKEN=$(echo "$GENERATE_RESPONSE" | jq -r '.data?.token' 2>/dev/null || echo "")
MEMBER_ID=$(echo "$GENERATE_RESPONSE" | jq -r '.data?.memberId' 2>/dev/null || echo "")

if [ -z "$VERIFY_TOKEN" ] || [ "$VERIFY_TOKEN" = "null" ]; then
  echo "❌ Failed to generate ID card details. Response:"
  echo "$GENERATE_RESPONSE"
  exit 1
fi

echo "✅ ID Card details generated. Member ID: $MEMBER_ID"
echo "Generated token: $VERIFY_TOKEN"

# 5. Verify the token
echo -e "\n5. Verifying token..."
VERIFY_RESPONSE=$(curl -s "$BASE_URL/api/id-card/verify/$VERIFY_TOKEN")
VERIFY_VALID=$(echo "$VERIFY_RESPONSE" | jq -r '.data?.valid' 2>/dev/null || echo "")

if [ "$VERIFY_VALID" != "true" ]; then
  echo "❌ Token verification failed. Response:"
  echo "$VERIFY_RESPONSE"
  exit 1
fi

echo "✅ Token verified successfully!"
echo -e "\n=== Test Summary ==="
echo "- User: $EMAIL"
echo "- Card ID: $CARD_ID"
echo "- Member ID: $MEMBER_ID"
echo "- Token: $VERIFY_TOKEN"
echo -e "\n🎉 All tests passed successfully! 🎉"
