#!/bin/bash

# Deployment script for Cloudflare Workers
set -e

echo "🚀 Starting deployment to Cloudflare Workers..."

# Check if user is logged in to Cloudflare
echo "🔍 Checking Cloudflare login status..."
if ! wrangler whoami >/dev/null 2>&1; then
  echo "⚠️  Not logged in to Cloudflare. Please run 'wrangler login' first."
  exit 1
fi

# Set environment variables for production
export ENVIRONMENT="production"

# Build the project
echo "🔨 Building the project..."
npm run build

# Deploy to production
echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy --env production

echo "✅ Deployment complete!"
echo "🔗 Your Worker is live at: https://leamsp-api.<your-account>.workers.dev"
