#!/bin/bash

# Database Restore Script
# Usage: ./restore.sh <backup_file>

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Please provide a backup file"
    echo "Usage: ./restore.sh <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh /opt/uk-tax-advisor/backups/
    exit 1
fi

BACKUP_FILE=$1

echo "⚠️  UK Tax Advisor - Database Restore"
echo "====================================="
echo ""
echo "This will REPLACE the current database with: $BACKUP_FILE"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

cd /opt/uk-tax-advisor/app/deployment

echo "📦 Decompressing backup..."
gunzip -c "$BACKUP_FILE" > /tmp/restore.sql

echo "🗑️  Dropping existing database..."
docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS uk_tax_advisor;"
docker compose exec -T db psql -U postgres -c "CREATE DATABASE uk_tax_advisor;"

echo "📥 Restoring database..."
docker compose exec -T db psql -U postgres uk_tax_advisor < /tmp/restore.sql

# Clean up
rm /tmp/restore.sql

echo "✅ Database restored successfully!"
echo ""
