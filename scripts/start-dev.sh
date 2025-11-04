#!/bin/bash

# This script starts all services defined in docker-compose.yml in the foreground.

set -e # Exit immediately if a command exits with a non-zero status.

# Kill any process that is already using port 3000
echo "▶️ Killing any process on port 3000..."
kill -9 $(lsof -t -i:3000) 2>/dev/null || true

echo "▶️ Starting all services with podman-compose..."
podman-compose up

echo "✅ Services have been stopped."
