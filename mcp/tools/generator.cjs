#!/usr/bin/env node
'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Usage: generator.cjs <name> <backendUrl> [zipPath]');
    process.exit(2);
  }
  const [name, backendUrl, zipPath] = argv;
  const ROOT = path.resolve(__dirname, '..');
  const JUNGLE_MANIFESTS = path.join(ROOT, 'mcp', 'jungle', 'manifests');
  const GENERATED = path.join(ROOT, 'mcp', 'generated');
  const PROXY_CONFIG = path.join(
    ROOT,
    'mcp',
    'mcp-proxy-master',
    'config.local.json'
  );

  await fsp.mkdir(JUNGLE_MANIFESTS, { recursive: true });
  await fsp.mkdir(GENERATED, { recursive: true });

  if (zipPath) {
    const destDir = path.join(GENERATED, name);
    await fsp.mkdir(destDir, { recursive: true });
    console.log(`Unpacking ${zipPath} -> ${destDir}`);
    try {
      execSync(
        `unzip -o ${JSON.stringify(zipPath)} -d ${JSON.stringify(destDir)}`,
        { stdio: 'inherit' }
      );
    } catch (err) {
      console.error('Failed to unzip:', err.message);
      process.exit(3);
    }
  }

  // Build a manifest template
  const manifest = {
    name,
    displayName: `${name} MCP`,
    description: `Generated MCP adapter for ${name}`,
    backendEnvVar: `MCP_${name.toUpperCase()}_URL`,
    invoker: { type: 'lootbox_rpc', rpcPath: '/rpc' },
    tools: [
      {
        name: 'code_generate',
        namespace: 'code',
        method: 'generate',
        description: 'Generate source code from a prompt',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            language: { type: 'string' },
            maxTokens: { type: 'integer' },
            streaming: { type: 'boolean' },
          },
          required: ['prompt'],
        },
        streaming: true,
        roles: ['devtools', 'engineering'],
      },
      {
        name: 'fs_readFile',
        namespace: 'fs',
        method: 'readFile',
        description: 'Read a file from the adapter host',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
        streaming: false,
        roles: ['infra', 'devtools'],
      },
    ],
    prompts: [
      {
        id: 'starter',
        title: 'Code mode starter',
        content: 'Write a function that satisfies the following prompt...',
      },
    ],
  };

  const manifestPath = path.join(JUNGLE_MANIFESTS, `${name}-manifest.json`);
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Wrote manifest:', manifestPath);

  // Update proxy config (idempotent)
  try {
    const cfgRaw = await fsp.readFile(PROXY_CONFIG, 'utf8');
    const cfg = JSON.parse(cfgRaw);
    cfg.mcpServers = cfg.mcpServers || {};
    // set server entry to spawn the generic adapter runtime via /host
    cfg.mcpServers[name] = {
      command: 'node',
      args: ['/host/LootboxMcpAdapter.cjs'],
      env: {
        [manifest.backendEnvVar || `MCP_${name.toUpperCase()}_URL`]: backendUrl,
        LOOTBOX_URL: backendUrl,
      },
      options: { logEnabled: true },
    };
    await fsp.writeFile(PROXY_CONFIG, JSON.stringify(cfg, null, 2), 'utf8');
    console.log('Updated proxy config:', PROXY_CONFIG);
  } catch (err) {
    console.warn(
      'Could not update proxy config (file missing?):',
      PROXY_CONFIG,
      err.message
    );
  }

  console.log('\nNext steps:');
  console.log(
    ` - Ensure adapter bundle is at mcp/jungle/LootboxMcpAdapter.cjs`
  );
  console.log(
    ` - Start or restart the proxy container (it will spawn: node /host/LootboxMcpAdapter.cjs)`
  );
  console.log(
    ` - Register with MCPJungle at: http://host.docker.internal:9090/${name}/mcp`
  );
  console.log(` - You can customize the manifest at ${manifestPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
