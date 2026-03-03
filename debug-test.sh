#!/bin/bash

# Quick debug test for API endpoints

BASE_URL="http://localhost:8787/api"
EMAIL="test_1772543040@leamsp.com"
PASSWORD="NewTest@12345678"

echo "=== Login ==="
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

echo "$LOGIN_RESP" | jq '.'

TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.token')
echo ""
echo "Token: $TOKEN"
echo ""

echo "=== Test ID Card Creation ==="
CARD_RESP=$(curl -s -X POST "${BASE_URL}/id-cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"displayName":"Test Card","attributes":{}}')

echo "$CARD_RESP" | jq '.'
echo ""

echo "=== Test Profile ==="
PROFILE_RESP=$(curl -s -X GET "${BASE_URL}/profile" \
  -H "Authorization: Bearer ${TOKEN}")

echo "$PROFILE_RESP" | jq '.'
echo ""

echo "=== Test Upload (Cloudinary config) ==="
CLOUDINARY_RESP=$(curl -s -X POST "${BASE_URL}/cloudinary" \
  -H "Authorization: Bearer ${TOKEN}")

echo "$CLOUDINARY_RESP" | jq '.'
