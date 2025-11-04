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
BACKEND_DIR="/home/guy/DoMoreCo"
FRONTEND_DIR="/home/guy/DoMoreCo/my-app"

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Optionally run model syncs on startup (can be skipped by setting SKIP_MODEL_SYNC=1)
if [ -z "$SKIP_MODEL_SYNC" ]; then
	echo "🔁 Running model synchronization scripts before startup..."
	# Ensure we run the script from the repository root so relative paths resolve
	if command -v npx >/dev/null 2>&1; then
		(cd "$REPO_ROOT" && npx tsx src/scripts/sync-models.ts) || echo "sync-models failed"
	else
		# fallback: try node to run JS transpiled output if available (from repo root)
		if [ -f "$REPO_ROOT/dist/src/scripts/sync-models.js" ]; then
			node "$REPO_ROOT/dist/src/scripts/sync-models.js" || echo "sync-models failed"
		else
			echo "⚠️ Could not run sync-models: npx not found and dist script missing"
		fi
	fi
else
	echo "⏭️ SKIP_MODEL_SYNC set, skipping model synchronization"
fi

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
(cd "$BACKEND_DIR" && npm run dev >/tmp/domore-backend.log 2>&1) &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (logs: /tmp/domore-backend.log)"

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start frontend server
echo "🖥️  Starting frontend server on port 3001..."
(cd "$FRONTEND_DIR" && npm run dev -- --port 3001 >/tmp/domore-frontend.log 2>&1) &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID (logs: /tmp/domore-frontend.log)"

# Save PIDs for shutdown
echo $BACKEND_PID > /tmp/domore-backend.pid
echo $FRONTEND_PID > /tmp/domore-frontend.pid

echo "✅ Servers started!"
echo "   Backend:  http://localhost:3000/api"
echo "   Frontend: http://localhost:3001"
echo ""
echo "To stop servers, run: ./stop-servers.sh"

# Keep script running
wait