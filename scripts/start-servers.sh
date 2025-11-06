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
# Resolve repository root early so subsequent paths are correct
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
# Prefer repo-relative frontend folder; fall back to legacy path if present
FRONTEND_DIR="$REPO_ROOT/frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
	echo "⚠️ Frontend directory not found at $FRONTEND_DIR"
fi

# Model synchronization now runs automatically inside the backend server on startup.
# See /tmp/domore-backend.log for details and model counts.

# Ensure proxy is running (expected at :9090)
PROXY_HEALTH_URL="http://localhost:9090/"
echo "🔎 Checking for proxy at $PROXY_HEALTH_URL"
if ! curl -sS "$PROXY_HEALTH_URL" >/dev/null 2>&1; then
	echo "Proxy not reachable on $PROXY_HEALTH_URL — attempting to start proxy via docker-compose"
	if [ -f ./mcp/mcp-proxy-master/docker-compose.yaml ] || [ -f ./mcp/mcp-proxy-master/docker-compose.yml ]; then
		docker compose -f ./mcp/mcp-proxy-master/docker-compose.yaml up -d || docker compose -f ./mcp/mcp-proxy-master/docker-compose.yml up -d || echo "Failed to start proxy via docker-compose"
		# wait briefly
		sleep 3
		if ! curl -sS "$PROXY_HEALTH_URL" >/dev/null 2>&1; then
			echo "⚠️ Proxy still not reachable after start attempt. Proceeding but you may need to start proxy manually."
		else
			echo "✅ Proxy appears to be running."
		fi
	else
		echo "⚠️ Proxy docker-compose not found at ./mcp/mcp-proxy-master/docker-compose.yaml"
	fi
else
	echo "✅ Proxy is reachable."
fi

# Start backend server

echo "📡 Starting backend server on port 3000..."
# Run backend directly with tsx pointing at the backend source path (repo uses backend/src/...)
if command -v npx >/dev/null 2>&1; then
	(cd "$REPO_ROOT" && npx tsx watch --ignore 'state/**' backend/src/server/index.ts >/tmp/domore-backend.log 2>&1) &
else
	# fallback to npm script if npx not available
	(cd "$BACKEND_DIR" && npm run dev >/tmp/domore-backend.log 2>&1) &
fi
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (logs: /tmp/domore-backend.log)"

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start frontend server (only if frontend dir exists)
if [ -d "$FRONTEND_DIR" ]; then
	echo "🖥️  Starting frontend server on port 3001..."
	(cd "$FRONTEND_DIR" && npm run dev -- --port 3001 >/tmp/domore-frontend.log 2>&1) &
	FRONTEND_PID=$!
	echo "Frontend PID: $FRONTEND_PID (logs: /tmp/domore-frontend.log)"
else
	echo "⚠️ Frontend directory not found at $FRONTEND_DIR — skipping frontend start"
	FRONTEND_PID=0
fi

# Save PIDs for shutdown
echo $BACKEND_PID > /tmp/domore-backend.pid
if [ "$FRONTEND_PID" -ne 0 ]; then
	echo $FRONTEND_PID > /tmp/domore-frontend.pid
fi

echo "✅ Servers started!"
echo "   Backend:  http://localhost:3000/api"
echo "   Frontend: http://localhost:3001"
echo ""
echo "To stop servers, run: ./stop-servers.sh"

# Keep script running
wait