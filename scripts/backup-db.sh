#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="infrapilot_db"
DB_NAME="${POSTGRES_DB:-infrapilot_db}"
DB_USER="${POSTGRES_USER:-infrapilot}"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Run pg_dump in the container
echo "Creating backup for $DB_NAME..."
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/backup_$TIMESTAMP.sql

# Compress the backup
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# Keep only the last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"
