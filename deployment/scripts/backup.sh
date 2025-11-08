#!/bin/bash

# Database Backup Script
# Usage: ./backup.sh

set -e

BACKUP_DIR="/opt/uk-tax-advisor/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

echo "💾 UK Tax Advisor - Database Backup"
echo "===================================="
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Creating database backup..."
cd /opt/uk-tax-advisor/app/deployment

docker compose exec -T db pg_dump -U postgres uk_tax_advisor > "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

echo "✅ Backup created: ${BACKUP_FILE}.gz"
echo "Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"

# Keep only last 7 days of backups
echo "🧹 Cleaning old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete

echo ""
echo "📋 Available backups:"
ls -lh "$BACKUP_DIR"
echo ""
