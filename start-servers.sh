#!/bin/bash

# DoMoreCo Server Startup Script
# Starts both backend and frontend servers

echo "🚀 Starting DoMoreCo Servers..."

# Kill any existing servers
echo "🧹 Cleaning up existing processes..."
pkill -f "tsx watch"
pkill -f "next dev"
sleep 2

# Start backend server
echo "📡 Starting backend server on port 3000..."
cd /home/guy/DoMoreCo
tsx watch src/server/index.ts &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start frontend server
echo "🖥️  Starting frontend server on port 3000..."
cd /home/guy/DoMoreCo/my-app
npm run dev -- --port 3000 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Save PIDs for shutdown
echo $BACKEND_PID > /tmp/domore-backend.pid
echo $FRONTEND_PID > /tmp/domore-frontend.pid

echo "✅ Servers started!"
echo "   Backend:  http://localhost:3000/api"
echo "   Frontend: http://localhost:3000"
echo ""
echo "To stop servers, run: ./stop-servers.sh"

# Keep script running
wait