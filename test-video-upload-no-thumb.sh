#!/bin/bash
set -euo pipefail

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:8787"}  # Default to local development server
VIDEO_FILE="test-video.mp4"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq and try again."
    exit 1
fi

# Check if files exist
if [ ! -f "$VIDEO_FILE" ]; then
    echo "Error: Video file '$VIDEO_FILE' not found in the current directory."
    exit 1
fi

# Check if token is provided
if [ -z "${TOKEN:-}" ]; then
    echo "Error: TOKEN environment variable is not set."
    echo "Please log in first to get an authentication token:"
    echo "  TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"your-email@example.com","password":"your-password"}' | jq -r '.data.token')"
    exit 1
fi

# Test video upload
echo "Testing video upload to $BASE_URL/api/videos..."

# Execute the command and capture the output
RESPONSE=$(curl -s -X POST "$BASE_URL/api/videos" \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Test Video $(date +%s)" \
  -F "description=Automated test video upload" \
  -F "isPublic=true" \
  -F "video=@$VIDEO_FILE")

# Parse and display the response
echo -e "
Response:"
echo "$RESPONSE" | jq .

# Check if the upload was successful
if echo "$RESPONSE" | jq -e '.data.id' > /dev/null; then
    echo -e "
✅ Video uploaded successfully!"
    echo "Video ID: $(echo "$RESPONSE" | jq -r '.data.id')"
else
    echo -e "
❌ Video upload failed!"
    echo "Error: $(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')"
    exit 1
fi
