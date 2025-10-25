/**
 * @file This is the entry point that starts our application.
 *
 * Why It's Necessary:
 * Every application needs a starting point. This file is the `main()` function of our
 * service. It's what we run with `node` or `tsx` to bring the entire system online.
 *
 * Main Parts:
 * - This is a script file, so it has no main named exports. It will instantiate and start the Express server.
 */

// This must be the very first thing to run, so that all other modules
// have access to the environment variables from the .env file.
import 'dotenv/config';
 
import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './router';
import logger from '../utils/logger';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}), // We can add context here later if needed (e.g., for auth)
  })
);

app.listen(PORT, () => {
  logger.info(`🚀 Server listening on http://localhost:${PORT}`);
});
