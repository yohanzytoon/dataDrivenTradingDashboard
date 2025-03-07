#!/bin/bash

echo "Starting the Trading Dashboard Application..."

# Start backend
echo "Starting backend server..."
cd ~/Downloads/project/backend
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3
echo "Backend started with PID: $BACKEND_PID"

# Start ML service
echo "Starting ML service..."
cd ~/Downloads/project/ml-service
source venv/bin/activate 2>/dev/null || python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn pandas > /dev/null
python main.py &
ML_PID=$!

# Wait for ML service to start
sleep 2
echo "ML service started with PID: $ML_PID"

# Start frontend
echo "Starting frontend..."
cd ~/Downloads/project/frontend
npm start &
FRONTEND_PID=$!

echo "Frontend starting with PID: $FRONTEND_PID"
echo "Dashboard should be available at http://localhost:3000 shortly"

# Setup trap to kill all processes on exit
trap "echo 'Shutting down...'; kill $BACKEND_PID $ML_PID $FRONTEND_PID; echo 'Stopped all services.'; exit" INT TERM EXIT

# Wait for all background processes
wait
