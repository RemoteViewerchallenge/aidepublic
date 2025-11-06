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
 
// eslint-disable-next-line import/order
import type { Server } from 'http';

import logger from '@/utils/logger.js';

import { createServer } from '@/server/server.js';

const app = createServer();
const PORT = process.env.PORT || 3000;

app.get('/healthz', (_req, res) => {
  // Simple health check endpoint
  res.status(200).send('OK');
});

let server: Server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`🚀 Server listening on http://localhost:${PORT}` as string);
  });
}

export { app, server };
