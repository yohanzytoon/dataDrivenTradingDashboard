#!/bin/bash

# Set variables
PROJECT_DIR="/path/to/trading-dashboard"
DOCKER_COMPOSE="docker-compose"
BRANCH="main"
ENV_FILE=".env"

# Function to check if a URL is available
check_url() {
  local url=$1
  local timeout=$2
  local count=0
  
  echo "Checking $url..."
  
  while [ $count -lt $timeout ]; do
    if curl -s -f -o /dev/null "$url"; then
      echo "Service is up!"
      return 0
    fi
    
    echo "Waiting for service to come online..."
    sleep 1
    count=$((count + 1))
  done
  
  echo "Timeout reached. Service is not responding."
  return 1
}

# Navigate to project directory
cd $PROJECT_DIR

# Pull latest code
echo "Pulling latest code from $BRANCH branch..."
git checkout $BRANCH
git pull origin $BRANCH

# Load environment variables
if [ -f $ENV_FILE ]; then
  source $ENV_FILE
else
  echo "Error: Environment file not found!"
  exit 1
fi

# Pull latest images
echo "Pulling latest Docker images..."
$DOCKER_COMPOSE pull

# Start services with zero downtime
echo "Starting services..."
$DOCKER_COMPOSE up -d --no-deps --build

# Check if services are up
echo "Verifying services..."
check_url "http://localhost/health" 30
FRONTEND_STATUS=$?

check_url "http://localhost:5001/health" 30
BACKEND_STATUS=$?

check_url "http://localhost:5002/health" 30
ML_STATUS=$?

# Report status
if [ $FRONTEND_STATUS -eq 0 ] && [ $BACKEND_STATUS -eq 0 ] && [ $ML_STATUS -eq 0 ]; then
  echo "Deployment completed successfully!"
  
  # Clean up old images
  echo "Cleaning up old images..."
  docker image prune -af
  
  exit 0
else
  echo "Deployment verification failed!"
  echo "Frontend status: $FRONTEND_STATUS"
  echo "Backend status: $BACKEND_STATUS"
  echo "ML service status: $ML_STATUS"
  
  exit 1
fi