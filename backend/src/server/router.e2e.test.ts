/**
 * @file This is the end-to-end test for our API router.
 *
 * It starts the actual server and makes real network calls to the API endpoints,
 * including those that interact with the MCP Shell Server. This is our "ignition test"
 * to confirm that the whole system is working together.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from './server.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('API Router - End-to-End', () => {
  let server: Server;
  let url: string;

  // Start the server before all tests
  beforeAll(async () => {
    const testServer = createServer();
    server = testServer.listen();
    const address = server.address() as AddressInfo;
    url = `http://localhost:${address.port}`;
  });

  // Stop the server after all tests
  afterAll(() => {
    server.close();
  });

  it('should successfully run a shell command via the MCP server', async () => {
    // This test assumes the `mcp-shell-server` is running and accessible.
    // The `docker-compose.yml` file ensures this dependency is met.
    // The `.env` file must have `SHELL_MCP_URL=http://localhost:5001/mcp`.

    // Act: Make a real HTTP request to our dedicated MCP endpoint.
    const response = await fetch(`${url}/api/trpc/runShellCommand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // No input needed for this simple task
    });

    // Assert: Check that the response from the shell command is what we expect.
    expect(response.ok, `API request failed with status ${response.status}.`).toBe(true);

    // Define the expected shape of the tRPC response for type safety.
    const result = (await response.json()) as {
      result: {
        data: {
          json: { stdout: string; status: number };
        };
      };
    };

    // Assert that the command executed successfully and returned the correct output.
    expect(result.result.data.json.status).toBe(0);
    expect(result.result.data.json.stdout).toContain('Hello from the shell!');
  });
});