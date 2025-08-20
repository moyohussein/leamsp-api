#!/bin/bash
set -e

echo "Setting up database migrations..."

# Create _prisma_migrations table if it doesn't exist
npx wrangler d1 execute leamsp-db --env production --command '
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
);' --remote

echo "_prisma_migrations table created or already exists"

# Apply the initial schema if it hasn't been applied yet
if [ -f "migrations/0000_initial_schema.sql" ]; then
    echo "Applying initial schema..."
    npx wrangler d1 execute leamsp-db --env production --file migrations/0000_initial_schema.sql --remote
    
    # Mark the initial migration as applied
    echo "Marking initial migration as applied..."
    npx wrangler d1 execute leamsp-db --env production --command "
    INSERT INTO _prisma_migrations (id, migration_name, checksum, started_at, applied_steps_count) 
    VALUES ('0000_initial_schema', '0000_initial_schema', 'initial', datetime('now'), 1)
    ON CONFLICT(id) DO NOTHING;" --remote
fi

# Apply the rest of the migrations
for migration in migrations/000[1-9]_*.sql; do
    if [ -f "$migration" ]; then
        migration_name=$(basename "$migration" .sql)
        echo "Applying migration: $migration_name"
        
        # Apply the migration
        npx wrangler d1 execute leamsp-db --env production --file "$migration" --remote
        
        # Mark the migration as applied
        npx wrangler d1 execute leamsp-db --env production --command "
        INSERT INTO _prisma_migrations (id, migration_name, checksum, started_at, applied_steps_count) 
        VALUES ('$migration_name', '$migration_name', 'applied', datetime('now'), 1)
        ON CONFLICT(id) DO NOTHING;" --remote
    fi
done

echo "All migrations applied successfully!"
