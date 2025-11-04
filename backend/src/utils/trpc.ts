/**
 * @file This file contains the tRPC client setup for our frontend application.
 *
 * Why It's Necessary:
 * This is the magic that connects our frontend to our backend with end-to-end
 * type safety. It creates a typed client that knows the exact shape of our
 * backend API, including all procedures, inputs, and outputs.
 */

import { createTRPCReact } from '@trpc/react-query';

import type { AppRouter } from '../server/router.js';

/**
 * The tRPC client.
 *
 * We can now use hooks like `trpc.getBestModelForTask.useQuery()` in our
 * React components to call our backend API.
 */
export const trpc = createTRPCReact<AppRouter>();