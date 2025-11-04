#!/bin/bash

# This script gracefully stops all services managed by podman-compose.

set -e # Exit immediately if a command exits with a non-zero status.

echo "▶️ Stopping all services managed by podman-compose..."
podman-compose down
echo "✅ All services have been stopped."