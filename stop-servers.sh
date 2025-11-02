#!/bin/bash

# DoMoreCo Server Shutdown Script
# Stops both backend and frontend servers

echo "🛑 Stopping DoMoreCo Servers..."

# Kill by process name
echo "🧹 Killing tsx watch processes..."
pkill -f "tsx watch"

echo "🧹 Killing next dev processes..."
pkill -f "next dev"

# Kill by saved PIDs
if [ -f /tmp/domore-backend.pid ]; then
    BACKEND_PID=$(cat /tmp/domore-backend.pid)
    echo "🔪 Killing backend PID: $BACKEND_PID"
    kill $BACKEND_PID 2>/dev/null
    rm /tmp/domore-backend.pid
fi

if [ -f /tmp/domore-frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/domore-frontend.pid)
    echo "🔪 Killing frontend PID: $FRONTEND_PID"
    kill $FRONTEND_PID 2>/dev/null
    rm /tmp/domore-frontend.pid
fi

# Force kill any remaining processes
sleep 2
pkill -9 -f "tsx watch" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null

echo "✅ All servers stopped!"

# Show remaining processes (if any)
REMAINING=$(ps aux | grep -E "(tsx|next)" | grep -v grep | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo "⚠️  Some processes may still be running:"
    ps aux | grep -E "(tsx|next)" | grep -v grep
else
    echo "🎉 All processes cleanly terminated!"
fi