/**
 * @file Defines our public-facing API using tRPC.
 *
 * Why It's Necessary:
 * This file is the key to our end-to-end type safety. By defining the API shape here and using `zod` for
 * input validation, we ensure that any client communicates with our backend perfectly, with no risk of data
 * mismatch. It makes the API contract explicit and verifiable by the TypeScript compiler.
 *
 * Main Parts:
 * - `const appRouter`: The tRPC router definition containing all procedures.
 * - `type AppRouter`: The exported type of the router, used by the client for type safety.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { GeminiAdapter } from '../adapters/GeminiAdapter.js';
import { ModelSelector } from '../core/ModelSelector.js';
import { ProviderManager } from '../core/ProviderManager.js';
import { StateRepository } from '../state/StateRepository.js';
// import { agent } from 'volcano-sdk';
import { OpenRouterAdapter } from '../adapters/OpenRouterAdapter.js';
import { getEnv } from '../utils/env.js';

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
// import { ArbitrageEngineAdapter } from '../core/ArbitrageEngineAdapter.js';
// const arbitrageEngineAdapter = new ArbitrageEngineAdapter(providerManager, modelSelector);

// Initialize the ProviderManager to start health checks and load state.
// DISABLED: We use database-based model management instead of real-time API calls
// providerManager.initialize();
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
        criteria: z
          .object({
            minContext: z.number().optional(),
            maxContext: z.number().optional(),
            toolCalling: z.boolean().optional(),
            vision: z.boolean().optional(),
            reasoning: z.boolean().optional(),
            embedding: z.boolean().optional(),
            maxParameters: z.number().optional(),
            preferredProviders: z.array(z.string()).optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      // 1. Get free models directly from database instead of ProviderManager
      const { default: pool } = await import('../db/index.js');
      const result = await pool.query(`
        SELECT * FROM models 
        WHERE provider = 'openrouter'
          AND raw_data->'pricing'->>'image' = '0'
          AND raw_data->'pricing'->>'prompt' = '0'
          AND raw_data->'pricing'->>'request' = '0'
          AND raw_data->'pricing'->>'completion' = '0'
          AND raw_data->'pricing'->>'web_search' = '0'
          AND raw_data->'pricing'->>'internal_reasoning' = '0'
        ORDER BY context_length DESC
      `);

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No free models available. Please sync the database.',
        });
      }

      // 2. Use the "brain" to select the best model for the task.
      const chosenModel = await modelSelector.selectModel({
        minContext: input.criteria?.minContext,
        maxContext: input.criteria?.maxContext,
        toolCalling: input.criteria?.toolCalling,
        vision: input.criteria?.vision,
        reasoning: input.criteria?.reasoning,
        embedding: input.criteria?.embedding,
      });

      if (!chosenModel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message:
            'No suitable, healthy, and available model was found for this task.',
        });
      }

      return {
        modelId: chosenModel.id,
        apiProvider: chosenModel.apiProvider,
        sourceProvider: chosenModel.sourceProvider,
        reason:
          'Selected as the best available FREE model based on task requirements.',
      };
    }),

  /**
   * Generate content using the best available model for the task.
   * This is the main generation endpoint that your frontend will use.
   */
  generateContent: t.procedure
    .input(
      z.object({
        prompt: z.string().min(1),
        systemPrompt: z.string().optional(),
        temperature: z.number().min(0).max(2).optional().default(0.7),
        maxTokens: z.number().min(1).max(4000).optional().default(2000),
        modelCriteria: z
          .object({
            minContext: z.number().optional(),
            maxContext: z.number().optional(),
            toolCalling: z.boolean().optional(),
            vision: z.boolean().optional(),
            reasoning: z.boolean().optional(),
            embedding: z.boolean().optional(),
            maxParameters: z.number().optional(),
            preferredProviders: z.array(z.string()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Select best model for this task based on criteria
      const chosenModel = await modelSelector.selectModel({
        minContext: input.modelCriteria?.minContext,
        maxContext: input.modelCriteria?.maxContext,
        toolCalling: input.modelCriteria?.toolCalling,
        vision: input.modelCriteria?.vision,
        reasoning: input.modelCriteria?.reasoning,
        embedding: input.modelCriteria?.embedding,
      });

      if (!chosenModel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No suitable model available for generation.',
        });
      }

      // 3. Find the adapter for this model
      const adapter = providerManager.getAdapter(chosenModel.apiProvider);
      if (!adapter) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `No adapter found for provider: ${chosenModel.apiProvider}`,
        });
      }

      // 4. Prepare the chat completion request
      const messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
      }> = [];

      if (input.systemPrompt) {
        messages.push({ role: 'system', content: input.systemPrompt });
      }

      messages.push({ role: 'user', content: input.prompt });

      const chatRequest = {
        model: chosenModel.id,
        messages,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      };

      // 5. Execute the generation
      try {
        const response = await adapter.executeChatCompletion(chatRequest);

        return {
          content: response.choices[0]?.message?.content || '',
          model: response.model,
          usage: response.usage,
          providerId: chosenModel.apiProvider,
          modelId: chosenModel.id,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Generation failed: ${error.message}`,
          cause: error,
        });
      }
    }),

  /**
   * Get all available models with their current health status.
   */
  getAvailableModels: t.procedure.query(async () => {
    const models = await providerManager.getAvailableModels();
    return models.map(model => ({
      id: model.id,
      name: model.name || model.id,
      provider: model.apiProvider,
      contextLength: model.contextLength,
      capabilities: {
        toolCalling: model.id.includes('tool') || model.id.includes('function'),
        vision: model.id.includes('vision') || model.id.includes('gpt-4'),
        reasoning: model.id.includes('o1') || model.id.includes('reasoning'),
      },
    }));
  }),

  /**
   * Get all models from the unified models database table.
   * This is the new preferred method for getting model data.
   * Returns ALL AI Studio models + FREE OpenRouter models.
   */
  getModelsFromDatabase: t.procedure.query(async () => {
    try {
      // Import the pool here to avoid circular dependencies
      const { default: pool } = await import('../db/index.js');

      const result = await pool.query(`
        SELECT 
          id,
          provider,
          name,
          description,
          context_length,
          parameters,
          tool_calling,
          vision,
          reasoning,
          embedding,
          raw_data
        FROM models 
        WHERE provider = 'aistudio'
           OR (provider = 'openrouter'
               AND raw_data->'pricing'->>'image' = '0'
               AND raw_data->'pricing'->>'prompt' = '0'
               AND raw_data->'pricing'->>'request' = '0'
               AND raw_data->'pricing'->>'completion' = '0'
               AND raw_data->'pricing'->>'web_search' = '0'
               AND raw_data->'pricing'->>'internal_reasoning' = '0')
        ORDER BY provider, context_length DESC
      `);

      console.log(
        `📊 Found ${result.rows.length} models (AI Studio + FREE OpenRouter)`
      );

      return result.rows.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: model.provider,
        contextLength: model.context_length,
        parameters: model.parameters,
        capabilities: {
          toolCalling: model.tool_calling,
          vision: model.vision,
          reasoning: model.reasoning,
          embedding: model.embedding,
        },
        description: model.description,
        rawData: model.raw_data,
        isFree: model.provider === 'aistudio' || true, // AI Studio models are available, OpenRouter ones are guaranteed free
      }));
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch models from database: ${error.message}`,
      });
    }
  }),

  /**_
   * Runs a simple, single-step agent workflow to verify end-to-end integration.
   */
  // runAgentTask: t.procedure
  //   .input(z.object({ prompt: z.string().default('Confirm you are operational.') }))
  //   .mutation(async () => {
  //     // This procedure now correctly uses the Volcano agent with our custom engine.
  //     const simpleAgent = agent({
  //       llm: arbitrageEngineAdapter,
  //     });

  //     let result = '';
  //     await simpleAgent.run((s: any) => {
  //       console.log(s);
  //       result = s.output;
  //     });

  //     // The output from the Volcano agent is a simple string.
  //     return { output: result };
  //   }),

  /**
   * A dedicated procedure to test the connection to the Shell MCP.
   * This bypasses the agent and model selection to directly test the tool integration.
   */
  runShellCommand: t.procedure
    .input(
      z.object({ command: z.string().default('echo "Hello from the shell!"') })
    )
    .mutation(async ({ input }) => {
      const shellMcpUrl = getEnv('SHELL_MCP_URL');
      if (!shellMcpUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'SHELL_MCP_URL is not configured in the environment.',
        });
      }

      const requestBody = {
        jsonrpc: '2.0',
        method: 'run_tool',
        params: { command: input.command },
      };

      let response: Response;
      try {
        response = await fetch(shellMcpUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to connect to Shell MCP at ${shellMcpUrl}. Reason: ${error.message}`,
          cause: error,
        });
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Shell MCP request failed with status ${response.status}. Body: ${errorBody}`,
        });
      }

      return await response.json();
    }),
});

// Export the type of the router for the client to use. This is key for end-to-end type safety.
export type AppRouter = typeof appRouter;
