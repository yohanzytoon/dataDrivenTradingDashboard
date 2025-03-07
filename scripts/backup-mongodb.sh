#!/bin/bash

# Set variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb"
CONTAINER_NAME="mongodb"
DATABASE="trading-dashboard"
S3_BUCKET="your-s3-bucket-name"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Run the backup command
echo "Starting MongoDB backup at ${TIMESTAMP}"
docker exec ${CONTAINER_NAME} sh -c "mongodump --authenticationDatabase admin -u \${MONGO_INITDB_ROOT_USERNAME} -p \${MONGO_INITDB_ROOT_PASSWORD} --db ${DATABASE} --archive" > ${BACKUP_DIR}/${DATABASE}_${TIMESTAMP}.archive

# Compress the backup
gzip ${BACKUP_DIR}/${DATABASE}_${TIMESTAMP}.archive

# Upload to S3 (if AWS CLI is configured)
if command -v aws &> /dev/null; then
  echo "Uploading backup to S3"
  aws s3 cp ${BACKUP_DIR}/${DATABASE}_${TIMESTAMP}.archive.gz s3://${S3_BUCKET}/mongodb/${DATABASE}_${TIMESTAMP}.archive.gz
fi

# Clean up old backups (keep last 7 days)
find ${BACKUP_DIR} -name "${DATABASE}_*.archive.gz" -type f -mtime +7 -delete

echo "Backup completed at $(date)"
