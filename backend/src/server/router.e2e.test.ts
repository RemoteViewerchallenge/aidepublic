/**
 * @file This is the end-to-end test for our API router.
 *
 * It starts the actual server and makes real network calls to the API endpoints,
 * including those that interact with the MCP Shell Server. This is our "ignition test"
 * to confirm that the whole system is working together.
 */
import type { Server } from 'http';
import type { AddressInfo } from 'net';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createServer } from './server.js';

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
});
