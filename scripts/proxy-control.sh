#!/usr/bin/env bash
# Helper script to start/stop/status whitelisted MCP docker stacks.
# Usage: proxy-control.sh <start|stop|status> <stack-name>

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONF="$ROOT_DIR/config/proxy_ports.json"
STATE_FILE="/tmp/mcp_active.json"

function usage() {
  echo "Usage: $0 <start|stop|status> <stack-name>"
  exit 2
}

if [ $# -lt 2 ]; then
  usage
fi

ACTION=$1
STACK=$2

if [ ! -f "$CONF" ]; then
  echo "Proxy ports config not found: $CONF" >&2
  exit 1
fi

if ! jq -e ".\"$STACK\"" "$CONF" >/dev/null 2>&1; then
  echo "Stack '$STACK' is not whitelisted in $CONF" >&2
  exit 1
fi

# locate docker-compose file for the stack
COMPOSE_PATHS=(
  "$ROOT_DIR/mcp/$STACK/docker-compose.yaml"
  "$ROOT_DIR/mcp/$STACK/docker-compose.yml"
  "$ROOT_DIR/docker-compose.$STACK.yaml"
  "$ROOT_DIR/docker-compose.$STACK.yml"
)
COMPOSE_FILE=""
for p in "${COMPOSE_PATHS[@]}"; do
  if [ -f "$p" ]; then
    COMPOSE_FILE="$p"
    break
  fi
done

if [ -z "$COMPOSE_FILE" ]; then
  echo "Could not find docker-compose file for stack '$STACK'" >&2
  exit 1
fi

function ensure_state() {
  if [ ! -f "$STATE_FILE" ]; then
    echo '{}' > "$STATE_FILE"
  fi
}

function mark_active() {
  ensure_state
  tmp=$(mktemp)
  jq --arg s "$STACK" --argjson obj "{\"stack\": \"$STACK\", \"started_at\": $(date +%s), \"last_access\": $(date +%s)}" '. + {($s): $obj}' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

function clear_active() {
  ensure_state
  tmp=$(mktemp)
  jq "del(.$STACK)" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

case "$ACTION" in
  start)
    echo "Starting stack $STACK using compose file $COMPOSE_FILE"
    docker compose -f "$COMPOSE_FILE" up -d
    mark_active
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  stop)
    echo "Stopping stack $STACK"
    docker compose -f "$COMPOSE_FILE" down
    clear_active
    ;;
  status)
    echo "Status for stack $STACK (compose: $COMPOSE_FILE)"
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  *)
    usage
    ;;
esac
