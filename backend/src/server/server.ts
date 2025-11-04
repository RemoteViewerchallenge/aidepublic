/**
 * @file This file is responsible for creating the server instance.
 *
 * It's separated from index.ts so that we can import the server instance
 * in our tests without starting the server immediately. This follows best
 * practices for creating testable Node.js applications.
 */
import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
import cors from 'cors';

export function createServer() {
  const app = express();

  // Enable CORS for all requests, which is useful for development.
  app.use(cors());

  // The tRPC middleware is the core of our API.
  app.use(
    '/api/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: () => ({}), // Context is passed to all resolvers.
    }),
  );

  return app;
}