# MCP Contracts

This document serves as a reference for the API contracts of the Modular Capability Providers (MCPs) used in our system. It details the expected request and response formats for each tool.
All requests and responses follow the JSON-RPC 2.0 specification.

---

## 1. Shell MCP (`shell-mcp`)

This MCP provides an interface for executing shell commands. We are using the `sonirico/mcp-shell` implementation, which we build from source.
This server is stateless and expects a standard JSON-RPC `run_tool` request.

**Endpoint:** `/mcp`
**Method:** `POST`

### Request Format

The request body is a JSON-RPC 2.0 object for the `run_tool` method.

- **`jsonrpc`**: Must be `"2.0"`.
- **`method`**: Must be `"run_tool"`.
- **`params`**: An object specifying the tool name and its parameters.
  - **`command`** (string, required): The shell command to execute.
  - **`base64`** (boolean, optional): If true, `stdout` and `stderr` in the response will be base64-encoded.

#### Examples

**Basic command execution:**
```json
{
  "jsonrpc": "2.0",
  "method": "run_tool",
  "params": {
    "command": "echo Hello, World!"
  }
}
```

### Response Format

The response body is a JSON object detailing the result of the command execution.

#### Successful Response (`status: 0`)
```json
{
    "stdout": "command output",
    "stderr": "",
    "status": 0,
    "execution_time": 0.123
}
```

#### Error Response (e.g., `status: 1`)
This can occur if the command is not in the `ALLOW_COMMANDS` list or if the command itself fails.
```json
{
    "error": "Command not allowed: rm",
    "status": 1,
    "stdout": "",
    "stderr": "Command not allowed: rm",
    "execution_time": 0
}
```