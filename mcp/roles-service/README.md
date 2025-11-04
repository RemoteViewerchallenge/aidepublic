# Roles service

Simple JSON-backed roles service used by the MCP integration flow.

Endpoints

- GET /roles -> list roles
- POST /roles { id, name, description } -> create role
- GET /roles/:id/tools -> list tools assigned to role
- PUT /roles/:id/tools -> body: [ 'tool_a', 'tool_b' ] -> replace assignments
- POST /sync-tools -> body: { roleId, tools: [...] } -> helper to set assignments
- GET /health -> health check

Run locally

```bash
node mcp/roles-service/server.cjs
```

Data is persisted to `mcp/roles-service/store.json`.
