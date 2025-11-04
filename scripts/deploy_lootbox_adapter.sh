#!/usr/bin/env bash
set -euo pipefail

# Bundles the adapter, copies it into mcp/jungle (already in repo), starts mcp-proxy-master container with local config,
# and registers the proxy with MCPJungle.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
JUNGLE_DIR="$ROOT_DIR/mcp/jungle"
PROXY_DIR="$ROOT_DIR/mcp/mcp-proxy-master"
ADAPTER_SRC="$JUNGLE_DIR/src/core/LootboxMcpAdapter.ts"
ADAPTER_OUT="$JUNGLE_DIR/LootboxMcpAdapter.cjs"
PROXY_CONFIG="$PROXY_DIR/config.local.json"

echo "Bundling adapter..."
cd "$JUNGLE_DIR"
npx esbuild "$ADAPTER_SRC" --bundle --platform=node --target=node20 --outfile="$ADAPTER_OUT" --format=cjs --log-level=info

echo "Starting mcp-proxy-master container..."
# Stop any previous container
docker rm -f mcp-proxy-master || true

docker run -d --name mcp-proxy-master -p 9090:9090 \
  -v "$PROXY_CONFIG":/config/config.json:ro \
  -v "$JUNGLE_DIR":/host:ro,z \
  ghcr.io/tbxark/mcp-proxy:latest --config /config/config.json

# Wait a few seconds for the proxy to start
sleep 3

echo "Registering the proxy with MCPJungle..."
# Register the proxy endpoint with MCPJungle so it can be used as a server
# Adjust this URL if your MCPJungle expects a different field (this is an example)
curl -sS -X POST http://localhost:8080/api/v0/servers \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "lootbox-proxy",
    "transport": "streamable_http",
    "description": "Lootbox via mcp-proxy",
    "url": "http://localhost:9090/lootbox/mcp"
  }' -w "\nHTTP_STATUS:%{http_code}\n"

echo "Done. Check proxy logs: docker logs -f mcp-proxy-master" 
