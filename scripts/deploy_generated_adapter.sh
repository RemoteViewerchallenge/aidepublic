#!/usr/bin/env bash
set -euo pipefail

# Deploy a generated adapter via the proxy and register it with MCPJungle.
# Usage: deploy_generated_adapter.sh <name>

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
JUNGLE_DIR="$ROOT_DIR/mcp/jungle"
PROXY_CONFIG="$ROOT_DIR/mcp/mcp-proxy-master/config.local.json"
NAME="${1:-}"

if [ -z "$NAME" ]; then
  echo "Usage: $0 <name>"
  exit 2
fi

MANIFEST_SRC="$JUNGLE_DIR/manifests/$NAME-manifest.json"
if [ ! -f "$MANIFEST_SRC" ]; then
  echo "Manifest not found: $MANIFEST_SRC"
  exit 3
fi

echo "Bundling adapter (esbuild)..."
cd "$JUNGLE_DIR"
npx esbuild src/core/LootboxMcpAdapter.ts --bundle --platform=node --target=node20 --outfile=LootboxMcpAdapter.cjs --format=cjs --log-level=info

echo "Starting proxy container (idempotent)..."
docker rm -f mcp-proxy-master || true
docker run -d --name mcp-proxy-master -p 9090:9090 \
  -v "$PROXY_CONFIG":/config/config.json:ro,z \
  -v "$JUNGLE_DIR":/host:ro,z \
  ghcr.io/tbxark/mcp-proxy:latest --config /config/config.json

echo "Waiting for proxy to come up..."
sleep 2

REG_NAME="${NAME}-proxy"
echo "Registering the proxy server with MCPJungle (idempotent name: $REG_NAME)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v0/servers/$REG_NAME || true)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "204" ]; then
  echo "Server $REG_NAME already registered with MCPJungle (status $HTTP_STATUS). Skipping registration."
else
  POST_OUTPUT=$(curl -sS -X POST http://localhost:8080/api/v0/servers \
    -H 'Content-Type: application/json' \
    -d '{"name":"'"$REG_NAME"'","transport":"streamable_http","description":"Generated adapter via mcp-proxy","url":"http://host.docker.internal:9090/'"$NAME"'/mcp"}' -w "\nHTTP_STATUS:%{http_code}\n" ) || true
  echo "$POST_OUTPUT" | sed -n '1,200p'
  if echo "$POST_OUTPUT" | grep -qi "duplicate key"; then
    echo "Server $REG_NAME already exists (duplicate). Continuing."
  fi
fi

echo "Done. Check proxy logs: docker logs -f mcp-proxy-master"
