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
# This is the most reliable way to get the script's directory.
REPO_ROOT=$(dirname -- "$(readlink -f -- "$0")")
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

# Optionally run model syncs on startup (can be skipped by setting SKIP_MODEL_SYNC=1)
if [ -z "$SKIP_MODEL_SYNC" ]; then
	echo "🔁 Running model synchronization scripts before startup..."
	# Ensure we run the script from the repository root so relative paths resolve
	if command -v npx >/dev/null 2>&1; then
		# Prefer backend script if present (project stores scripts under backend/src/scripts)
		if [ -f "$BACKEND_DIR/src/scripts/sync-models.ts" ]; then
			(cd "$REPO_ROOT" && npx tsx backend/src/scripts/sync-models.ts) || echo "sync-models failed"
		elif [ -f "$REPO_ROOT/src/scripts/sync-models.ts" ]; then
			(cd "$REPO_ROOT" && npx tsx src/scripts/sync-models.ts) || echo "sync-models failed"
		else
			echo "⚠️ sync-models script not found in backend/src/scripts or src/scripts"
		fi
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
	PROXY_COMPOSE_FILE="$REPO_ROOT/mcp/mcp-proxy-master/docker-compose.yaml"
	if [ -f "$PROXY_COMPOSE_FILE" ]; then
		# --- FIX: Set permissions on config file ---
		# This prevents "permission denied" errors with Docker/Podman by making the config world-readable.
		PROXY_CONFIG_FILE="$REPO_ROOT/mcp/mcp-proxy-master/config.local.json"
		if [ -f "$PROXY_CONFIG_FILE" ]; then
			echo "🔐 Setting permissions for proxy config file..."
			chmod 644 "$PROXY_CONFIG_FILE"
		fi
		echo "🚀 Starting proxy container with 'docker compose up'..."
		(cd "$(dirname "$PROXY_COMPOSE_FILE")" && docker compose up -d)

		echo "⏳ Waiting for proxy to become healthy..."
		for i in {1..30}; do # Increased wait time to 60 seconds (30 * 2s)
			if curl -sS "$PROXY_HEALTH_URL" >/dev/null 2>&1; then
				echo "✅ Proxy is now reachable."
				break
			fi
			echo -n "."
			sleep 2
		done

		if ! curl -sS "$PROXY_HEALTH_URL" >/dev/null 2>&1; then
			echo "\n⚠️ Proxy still not reachable after 60 seconds. Displaying diagnostics..."
			echo "--------------------------------------------------"
			echo "🔎 Proxy container status:"
			(cd "$(dirname "$PROXY_COMPOSE_FILE")" && docker compose ps)
			echo "\n🔎 Last 20 lines of proxy container logs:"
			# The container name is typically <project>_app_1
			docker logs --tail 20 mcp-proxy-master-app-1 || echo "Could not fetch logs for mcp-proxy-master-app-1"
			echo "--------------------------------------------------"
			echo "Proceeding, but backend may fail if it cannot connect to the proxy."
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

# Export the authentication token so the backend process can access it.
export PROXY_CONTROL_TOKEN="guysilvermt8964"

if command -v npx >/dev/null 2>&1; then
	(cd "$REPO_ROOT" && npx tsx watch backend/src/server/index.ts >/tmp/domore-backend.log 2>&1) &
else
	# fallback to npm script if npx not available
	(cd "$REPO_ROOT/backend" && npm run dev >/tmp/domore-backend.log 2>&1) &
fi
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (logs: /tmp/domore-backend.log)"

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start frontend server (only if frontend dir exists)
if [ -d "$FRONTEND_DIR" ]; then
	echo "🖥️  Starting frontend server on port 3001..."
	# Pass the backend URL to the frontend as an environment variable
	# This allows the tRPC proxy in Next.js to find the backend.
	BACKEND_API_URL="http://localhost:3000/api/trpc"
	(cd "$FRONTEND_DIR" && NEXT_PUBLIC_API_URL="$BACKEND_API_URL" npm run dev >/tmp/domore-frontend.log 2>&1) &
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