#!/usr/bin/env node
/**
 * Simple idle watcher that stops stacks listed in /tmp/mcp_active.json
 * after a configurable idle timeout.
 * Usage: MCP_IDLE_TIMEOUT env var in seconds (default 600 = 10m)
 */

const fs = require('fs');
const { spawnSync } = require('child_process');
const STATE_FILE = '/tmp/mcp_active.json';
const TIMEOUT = parseInt(process.env.MCP_IDLE_TIMEOUT || '600', 10);

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return {};
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8') || '{}');
  } catch (e) {
    console.error('Failed to read state file', e);
    return {};
  }
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function stopStack(stack) {
  console.log('Stopping idle stack', stack);
  const script = `${process.cwd()}/scripts/proxy-control.sh`;
  const res = spawnSync(script, ['stop', stack], { stdio: 'inherit' });
  if (res.status !== 0) console.error('Failed to stop', stack);
}

function runOnce() {
  const state = loadState();
  const ts = now();
  for (const [stack, info] of Object.entries(state)) {
    const last = info.last_access || info.started_at || 0;
    if (ts - last > TIMEOUT) {
      console.log(`Stack ${stack} idle for ${ts - last}s, stopping`);
      stopStack(stack);
    }
  }
}

if (require.main === module) {
  runOnce();
}
