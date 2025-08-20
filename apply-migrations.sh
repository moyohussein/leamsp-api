#!/bin/bash
set -euo pipefail

# This script applies the D1 SQL migrations to the database.
# Usage: ./apply-migrations.sh [--local]
#   --local: Apply migrations to the local development database

# Default to remote database
LOCAL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      LOCAL=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ "$LOCAL" = true ]; then
  echo "🔧 Applying migrations to LOCAL database"
  FLAGS="--local"
else
  echo "☁️  Applying migrations to REMOTE database"
  FLAGS="--remote"
fi

# Helper to apply a file if present
apply() {
  local file="$1"
  if [[ -f "$file" ]]; then
    echo "🚀 Applying migration: $file"
    
    # Read the SQL content
    local sql_content
    sql_content=$(cat "$file")
    
    # Execute the SQL content
    if ! echo "$sql_content" | npx wrangler d1 execute leamsp-db $FLAGS --command="$sql_content"; then
      echo "❌ Error applying migration: $file"
      exit 1
    fi
    
    echo "✅ Successfully applied: $file"
    echo ""  # Add a blank line for better readability
  else
    echo "⚠️  Skip (missing): $file"
  fi
}

# Apply known-good, idempotent migrations in order
apply migrations/0000_initial_schema.sql
apply migrations/0001_create_user_table.sql

# 0002_add_tokens_and_user_fields.sql and 0003_add_user_role.sql use unsupported control-flow.
# We skip them and rely on 0005 to add required columns.

apply migrations/0004_create_id_cards.sql
apply migrations/0005_fix_users_timestamps_and_role.sql

# Videos table (finalized schema)
apply migrations/0011_fix_videos_table.sql

echo "All applicable migrations applied successfully."
