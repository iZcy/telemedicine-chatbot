#!/bin/bash

# Database Backup Script
# Creates a backup of the current database before reset

set -e

echo "💾 Creating database backup..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Extract database info from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL=${DATABASE_URL}
if [ -z "$DB_URL" ]; then
    echo "❌ DATABASE_URL not found in environment"
    exit 1
fi

# Parse DATABASE_URL
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DB_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

# Create backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_DIR="backups"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "📋 Database info:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Backup file: $BACKUP_DIR/$BACKUP_FILE"

# Create backup
echo "🔄 Creating backup..."
PGPASSWORD=$(echo $DB_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p') \
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_DIR/$BACKUP_FILE"
    echo "📊 Backup size: $(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Keep only last 5 backups
echo "🧹 Cleaning old backups (keeping last 5)..."
cd $BACKUP_DIR
ls -t backup_${DB_NAME}_*.sql | tail -n +6 | xargs -r rm --
cd ..

echo "💾 Backup completed!"