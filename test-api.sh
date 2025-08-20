#!/bin/bash

# Set the base URL
BASE_URL="http://localhost:8787/api"

# Generate a unique email for testing
TEST_EMAIL="testuser_$(date +%s)@example.com"
TEST_PASSWORD="Test@1234"

# Function to print section headers
print_header() {
    echo -e "\n\033[1;34m=== $1 ===\033[0m"
}

# Function to print test result
print_result() {
    if [ "$1" -eq 0 ]; then
        echo -e "\033[0;32m✓ $2\033[0m"
    else
        echo -e "\033[0;31m✗ $2\033[0m"
    fi
}

# Test 1: Register a new user
print_header "1. Testing User Registration"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "password_confirmation": "'$TEST_PASSWORD'"
  }')

echo "Response: $REGISTER_RESPONSE"

# Extract JWT token from login response
print_header "2. Testing User Login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }')

echo "Response: $LOGIN_RESPONSE"

# Extract JWT token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "Failed to get JWT token. Cannot proceed with authenticated tests."
    exit 1
fi

# Test 3: Get user profile
print_header "3. Testing Get User Profile"
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "Profile: $PROFILE_RESPONSE"

# Test 4: Create an ID Card
print_header "4. Testing ID Card Creation"
CARD_RESPONSE=$(curl -s -X POST "$BASE_URL/id-cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test ID Card",
    "attributes": {
      "department": "Engineering",
      "role": "Developer"
    }
  }')

echo "Card created: $CARD_RESPONSE"
CARD_ID=$(echo $CARD_RESPONSE | jq -r '.data.id')

# Test 5: List ID Cards
print_header "5. Testing List ID Cards"
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/id-cards/list" \
  -H "Authorization: Bearer $TOKEN")

echo "ID Cards: $LIST_RESPONSE"

# Test 6: Upload a test file
print_header "6. Testing File Upload"
# Create a test image file (1x1 pixel PNG)
echo -e '\x89PNG\x0d\x0a\x1a\x0a\x00\x00\x00\x0dIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x0a' > test_upload.png

UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_upload.png" \
  -F "type=profile")

# Clean up test file
rm -f test_upload.png

echo "Upload response: $UPLOAD_RESPONSE"

# Test 7: Test error handling with invalid data
print_header "7. Testing Error Handling - Invalid Registration"
ERROR_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"invalid-email","password":"short","password_confirmation":"mismatch"}')

echo "Error response: $ERROR_RESPONSE"

print_header "Testing Complete!"
echo -e "\nTest user email: $TEST_EMAIL"
echo "JWT Token: $TOKEN"
