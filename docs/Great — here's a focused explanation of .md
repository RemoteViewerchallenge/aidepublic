Great — here's a focused explanation of how the stdio adapter works, why your registration/handshake behavior looked the way it did, and exactly what to change if you want "code mode" (prompts/tools) behavior to work.

How MCP stdio adapters work (high level)

MCPJungle acts as the gateway/registry and can spawn "stdio" MCP servers as subprocesses. For stdio servers it runs a command (e.g., node /host/LootboxMcpAdapter.cjs) and communicates with that child process via stdout/stdin.
When a stdio server is spawned MCPJungle immediately sends an Initialize request to the subprocess (MCP Initialize handshake). The subprocess must respond with an Initialize response quickly (MCPJungle times out by default after ~10s).
After a successful Initialize, MCPJungle typically calls ListTools (to discover tools) and may call prompts-related methods (if it expects prompts) or other optional methods. If those RPC methods are not implemented, you will see "method not found" style errors for those requests.
The stdio process itself is a JSON-RPC-like MCP transport: your adapter reads JSON messages from stdin and writes responses to stdout (the SDK's StdioServerTransport handles this).
What your adapter (LootboxMcpAdapter.ts) does today — step-by-step

Construction/boot

The class constructs a Server instance from @modelcontextprotocol/sdk.
It sets up capabilities in the Server constructor (right now it sets tools: {}).
It calls setupHandlers() to register request handlers for specific MCP request schemas.
It populates this.namespaces with hardcoded namespaces and tools (ListTools uses this to enumerate tools).
MCP Initialize

You added an Initialize request handler:
It reads request.params.protocolVersion and returns:
{
protocolVersion: request.params.protocolVersion,
capabilities: { tools: {} },
serverInfo: { name: 'lootbox-mcp-adapter', version: '0.1.0' }
}
This is exactly what MCPJungle expects to complete the handshake.
ListTools

ListToolsRequestSchema handler iterates this.namespaces and returns an array of tools with:
name (e.g., "fs_readFile"),
description,
inputSchema (a JSON Schema shape for the tool args).
After Initialize, MCPJungle will call ListTools and ingest the tool list.
CallTool

CallToolRequestSchema handler receives tool name and arguments, maps the tool name to a Lootbox namespace+method, calls the Lootbox RPC (HTTP POST to /rpc/<ns>/<method>), and returns MCP content blocks containing the result as text.
Errors are wrapped in McpError(ErrorCode.InternalError, message).
Why you saw the "prompts" warning (and what it means)

MCPJungle tried to register prompts for the adapter. That code path calls prompts-related methods (prompts/list or prompts/get) on the adapter after initialization. The logs showed:
"failed to register prompts ... method not found"
Causes:
The adapter's Initialize response did not advertise prompts capability (capabilities.prompts = false/omitted).
MCPJungle's admin workflows may still attempt to fetch prompts depending on config or CLI action.
The bundled adapter contains the prompts request schemas (the SDK includes them), but the adapter did not register handlers for prompts/list or prompts/get.
Fix options:
Implement prompts handlers (prompts/list and prompts/get) and advertise capabilities.prompts: true in Initialize — then MCPJungle will get a valid prompt list.
OR leave prompts unsupported but suppress the attempt by not asking MCPJungle to register prompts (this is a behavior/config choice in MCPJungle or via the CLI).
Filesystem / container gotchas that bit you earlier

The container spawns "node /host/LootboxMcpAdapter.cjs", so the adapter file must be accessible inside the container at that exact path (LootboxMcpAdapter.cjs).
If the bind mount doesn't allow the container to read the file (SELinux labels, permissions), Node will fail with "Cannot find module '/host/LootboxMcpAdapter.cjs'".
Fixes we applied:
Put the bundle into the host directory that is mounted into the container and made the mount permissive for SELinux (:z).
Ensure file and directory permissions allow traversal and read by the container's UID (we ran chmod and adjusted mount label).
Networking note (Lootbox RPC URL)

The adapter's Lootbox client defaults to host.docker.internal:3005 or LOOTBOX_URL env var:
When running inside Docker, host.docker.internal may or may not resolve; setting LOOTBOX_URL in the container environment or using the host network or linking the Lootbox service into the compose network is necessary.
You set LOOTBOX_URL or use container networking appropriately to allow the adapter to reach Lootbox.
