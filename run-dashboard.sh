#!/bin/bash

# Function to check if MongoDB is running
check_mongodb() {
  mongo --eval "db.stats()" >/dev/null 2>&1
  return $?
}

# Ensure MongoDB is running
if ! check_mongodb; then
  echo "MongoDB is not running or not accessible. Starting MongoDB..."
  mongod --fork --logpath mongo.log
  sleep 3  # Give MongoDB time to start
  if ! check_mongodb; then
    echo "Failed to start MongoDB. The application may not work correctly."
  else
    echo "MongoDB started successfully."
  fi
fi

# Start backend
echo "Starting backend server..."
cd backend
node server.js &
BACKEND_PID=$!
cd ..

# Start ML service
echo "Starting ML service..."
cd ml-service
source venv/bin/activate
python main.py &
ML_PID=$!
cd ..

# Start frontend
#echo "Starting frontend..."
#cd frontend
#npm start &
#FRONTEND_PID=$!
#cd ..

echo "All services started. Press Ctrl+C to stop all."

# Setup trap to kill all processes on exit
trap "kill $BACKEND_PID $ML_PID $FRONTEND_PID; echo 'Stopped all services.'; exit" INT TERM EXIT

# Wait for all background processes
wait
