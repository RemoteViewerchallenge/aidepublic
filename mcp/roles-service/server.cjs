#!/usr/bin/env node
'use strict';
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.ROLES_SERVICE_PORT || 4600;
const STORE_FILE = path.join(__dirname, 'store.json');

let store = { roles: {}, assignments: {} };
try {
  if (fs.existsSync(STORE_FILE)) {
    store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) || store;
  }
} catch (err) {
  console.warn('Failed to load store:', err && err.message);
}

function persist() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist store:', err && err.message);
  }
}

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve(null);
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const u = url.parse(req.url, true);
  const parts = u.pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  try {
    // GET /roles
    if (req.method === 'GET' && u.pathname === '/roles') {
      const roles = Object.values(store.roles);
      return sendJSON(res, 200, roles);
    }

    // POST /roles  { id, name, description }
    if (req.method === 'POST' && u.pathname === '/roles') {
      const body = await parseBody(req);
      if (!body || !body.id)
        return sendJSON(res, 400, { error: 'id required' });
      store.roles[body.id] = {
        id: body.id,
        name: body.name || body.id,
        description: body.description || '',
      };
      persist();
      return sendJSON(res, 201, store.roles[body.id]);
    }

    // GET /roles/:id/tools
    if (req.method === 'GET' && parts[0] === 'roles' && parts[2] === 'tools') {
      const roleId = parts[1];
      if (!store.roles[roleId])
        return sendJSON(res, 404, { error: 'role not found' });
      const tools = store.assignments[roleId] || [];
      return sendJSON(res, 200, { role: store.roles[roleId], tools });
    }

    // PUT /roles/:id/tools  -> body: [ 'tool_a', 'tool_b']
    if (req.method === 'PUT' && parts[0] === 'roles' && parts[2] === 'tools') {
      const roleId = parts[1];
      if (!store.roles[roleId])
        return sendJSON(res, 404, { error: 'role not found' });
      const body = await parseBody(req);
      if (!Array.isArray(body))
        return sendJSON(res, 400, { error: 'expected array of tool names' });
      store.assignments[roleId] = body;
      persist();
      return sendJSON(res, 200, { role: store.roles[roleId], tools: body });
    }

    // POST /sync-tools -> body: { roleId, tools: [...] } (simple helper)
    if (req.method === 'POST' && u.pathname === '/sync-tools') {
      const body = await parseBody(req);
      if (!body || !body.roleId || !Array.isArray(body.tools))
        return sendJSON(res, 400, { error: 'roleId and tools required' });
      store.assignments[body.roleId] = body.tools;
      persist();
      return sendJSON(res, 200, {
        role: store.roles[body.roleId] || null,
        tools: body.tools,
      });
    }

    // Simple health
    if (req.method === 'GET' && u.pathname === '/health') {
      return sendJSON(res, 200, { status: 'ok' });
    }

    // Not found
    sendJSON(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('roles-service error', err && err.stack ? err.stack : err);
    sendJSON(res, 500, { error: 'internal' });
  }
});

server.listen(PORT, () => {
  console.log(`Roles service listening on http://localhost:${PORT}`);
});
