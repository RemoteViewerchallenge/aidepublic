/**
 * @file This file is responsible for creating the server instance.
 *
 * It's separated from index.ts so that we can import the server instance
 * in our tests without starting the server immediately. This follows best
 * practices for creating testable Node.js applications.
 */
import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';

import { appRouter, providerManager } from './router.js';
import { syncAndUnifyModels } from '../utils/modelSync.js';

export function createServer() {
  // --- Initialize Providers and Sync Models on Startup ---
  (async () => {
    try {
      console.log('🚀 Initializing provider manager...');
      await providerManager.initialize();
      console.log('✅ Provider manager initialized.');

      console.log('🚀 Kicking off automatic model database sync...');
      const result = await syncAndUnifyModels(providerManager);

      console.log('✅ Automatic model sync complete.');
      if (result.openrouter) {
        console.log(
          `   - OpenRouter: Found and synced ${result.openrouter.fetched} models.`
        );
      }
      if (result.aistudio) {
        console.log(
          `   - AI Studio: Found and synced ${result.aistudio.fetched} models.`
        );
      }
      if (result.google) {
        console.log(
          `   - Gemini: Found and synced ${result.google.fetched} models.`
        );
      }
      console.log(
        `   - Total unified models in database: ${result.unifiedCount}`
      );
    } catch (error) {
      console.error('❌ Automatic model sync failed on startup:', error);
    }
  })();

  const app = express();

  // Enable CORS for all requests, which is useful for development.
  app.use(cors());

  // The tRPC middleware is the core of our API.
  app.use(
    '/api/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: () => ({}), // Context is passed to all resolvers.
    })
  );

  return app;
}
