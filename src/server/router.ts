/**
 * @file Defines our public-facing API using tRPC.
 *
 * Why It's Necessary:
 * This file is the key to our end-to-end type safety. By defining the API shape here
 * and using `zod` for input validation, we ensure that any client (web, mobile, or
 * another agent) communicates with our backend perfectly, with no risk of data
 * mismatch. It makes the API contract explicit and verifiable by the TypeScript compiler.
 *
 * Main Parts:
 * - `const appRouter`: The tRPC router definition containing all procedures.
 * - `type AppRouter`: The exported type of the router, used by the client for type safety.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ProviderManager } from '../core/ProviderManager';
import { ModelSelector } from '../core/ModelSelector';
import { StateRepository } from '../state/StateRepository';
import { GeminiAdapter } from '../adapters/GeminiAdapter';
import { OpenRouterAdapter } from '../adapters/OpenRouterAdapter';

// --- Application Composition Root ---
// This is where we instantiate and wire together all the core components of our application.
const stateRepository = new StateRepository();
const geminiAdapter = new GeminiAdapter(); // Will be disabled if no key
const openRouterAdapter = new OpenRouterAdapter(); // Will be enabled if key exists

const providerManager = new ProviderManager(
  [geminiAdapter, openRouterAdapter],
  stateRepository
);
const modelSelector = new ModelSelector();

// Initialize the ProviderManager to start health checks and load state.
providerManager.initialize();
// --- End Composition Root ---

const t = initTRPC.create();

export const appRouter = t.router({
  /**
   * The primary procedure to find the best available free model for a given task.
   * This demonstrates the end-to-end flow of our system.
   */
  getBestModelForTask: t.procedure
    .input(
      // Use Zod for input validation, as per code_rules.md
      z.object({
        taskDescription: z.string().min(10),
        requiredCapabilities: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input }) => {
      // 1. Get a list of healthy, available models from the engine.
      const availableModels = await providerManager.getAvailableModels();

      // 2. Use the "brain" to select the best model for the task.
      const chosenModel = modelSelector.selectBestModel(availableModels, input.taskDescription);

      if (!chosenModel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No suitable, healthy, and available model was found for this task.',
        });
      }

      return {
        modelId: chosenModel.id,
        apiProvider: chosenModel.apiProvider,
        sourceProvider: chosenModel.sourceProvider,
        reason: 'Selected as the best available model based on task requirements.',
      };
    }),
});

// Export the type of the router for the client to use. This is key for end-to-end type safety.
export type AppRouter = typeof appRouter;