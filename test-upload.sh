#!/bin/bash

# Test script for the upload endpoint
# Usage: ./test-upload.sh <jwt_token> <file_path> [type] [id]

set -e

JWT_TOKEN="$1"
FILE_PATH="$2"
TYPE="${3:-profile}"  # Default to 'profile' if not provided
ID="$4"

if [ -z "$JWT_TOKEN" ] || [ -z "$FILE_PATH" ]; then
  echo "Usage: $0 <jwt_token> <file_path> [type] [id]"
  echo "Example: $0 'your.jwt.token' ~/Pictures/avatar.jpg profile"
  echo "Example: $0 'your.jwt.token' ~/Pictures/idcard.jpg idcard 123"
  exit 1
fi

if [ ! -f "$FILE_PATH" ]; then
  echo "Error: File not found: $FILE_PATH"
  exit 1
fi

# Base URL of the API
BASE_URL="https://leamsp-api.attendance.workers.dev"

# Build the curl command
CURL_CMD=(
  curl -s -X POST
  -H "Authorization: Bearer $JWT_TOKEN"
  -H "Content-Type: multipart/form-data"
  -F "file=@$FILE_PATH"
  -F "type=$TYPE"
)

# Add ID parameter if provided
if [ -n "$ID" ]; then
  CURL_CMD+=(-F "id=$ID")
fi

# Add the URL
CURL_CMD+=("${BASE_URL}/api/upload")

# Execute the curl command
echo "Uploading $FILE_PATH as $TYPE..."
"${CURL_CMD[@]}" | jq .

echo "\nNote: If you get a JWT error, make sure your token is valid and not expired."
