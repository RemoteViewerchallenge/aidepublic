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
import { GeminiAdapter } from '../adapters/GeminiAdapter';
import { ModelSelector } from '../core/ModelSelector';
import { ProviderManager } from '../core/ProviderManager';
import { StateRepository } from '../state/StateRepository';
// import { agent } from 'volcano-sdk';
import {
  createOrchestration,
  OrchestrationConfig,
} from '../../volcano-sdk/src/orchestration-creator';
import { ArbitrageEngineAdapter } from '../core/ArbitrageEngineAdapter';
import { agent } from '../../volcano-sdk/src/volcano-sdk';
import { OpenRouterAdapter } from '../adapters/OpenRouterAdapter';
import { getEnv } from '../utils/env';

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
const arbitrageEngineAdapter = new ArbitrageEngineAdapter(providerManager, modelSelector);

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
      const { default: pool } = await import('../db/index');
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
      const { default: pool } = await import('../db/index');

      // Query AI Studio models from ai_studio_models table
      const aiStudioResult = await pool.query(`
        SELECT 
          id,
          "displayName" as name,
          description,
          "inputTokenLimit" as context_length,
          "supportedGenerationMethods",
          temperature,
          "topP",
          "topK",
          thinking
        FROM ai_studio_models
        ORDER BY "inputTokenLimit" DESC NULLS LAST
      `);

      // Query OpenRouter models from openrouter_models table - ALL models
      const openRouterResult = await pool.query(`
        SELECT 
          id,
          name,
          description,
          context_length,
          architecture,
          pricing,
          supported_parameters
        FROM openrouter_models
        ORDER BY context_length DESC NULLS LAST
      `);

      const models: any[] = [];

      // Process AI Studio models with keyword detection
      aiStudioResult.rows.forEach((model: any) => {
        const modelName = (model.name || model.id || '').toLowerCase();
        const modelId = (model.id || '').toLowerCase();

        // Most Gemini models have vision capability
        const hasVision =
          modelName.includes('vision') ||
          modelName.includes('image') ||
          modelId.includes('vision') ||
          modelId.includes('gemini'); // Most Gemini models support vision

        const hasThinking =
          model.thinking ||
          modelName.includes('think') ||
          modelName.includes('reason') ||
          modelName.includes('experiment');

        const hasEmbedding =
          model.supportedGenerationMethods?.includes('embedContent') ||
          modelName.includes('embed');

        const hasTools =
          model.supportedGenerationMethods?.includes('generateContent') ||
          model.supportedGenerationMethods?.includes('toolUse');

        models.push({
          id: model.id,
          name: model.name || model.id?.replace('models/', ''),
          provider: 'aistudio',
          contextLength: model.context_length || 0,
          capabilities: {
            toolCalling: hasTools,
            vision: hasVision,
            reasoning: hasThinking,
            embedding: hasEmbedding,
            uncensored: modelName.includes('uncensored'),
            experimental: modelName.includes('experiment'),
          },
          description: model.description || '',
          parameters: null,
          rawData: model,
          isFree: true,
          source: 'ai_studio_models',
        });
      });

      // Process OpenRouter models with keyword detection
      // Note: openrouter_models table now only contains FREE models
      openRouterResult.rows.forEach((model: any) => {
        const modelName = (model.name || '').toLowerCase();
        const modelId = (model.id || '').toLowerCase();

        const hasVision =
          modelName.includes('vision') ||
          modelName.includes('image') ||
          modelId.includes('vision') ||
          model.architecture?.input_modalities?.includes('image');

        const hasThinking =
          modelName.includes('think') ||
          modelName.includes('reason') ||
          modelName.includes('o1') ||
          modelName.includes('experiment');

        const hasEmbedding =
          modelName.includes('embed') || modelId.includes('embed');

        const hasTools =
          model.supported_parameters?.includes('tools') ||
          model.supported_parameters?.includes('functions');

        models.push({
          id: model.id,
          name: model.name,
          provider: 'openrouter',
          contextLength: model.context_length || 0,
          capabilities: {
            toolCalling: hasTools,
            vision: hasVision,
            reasoning: hasThinking,
            embedding: hasEmbedding,
            uncensored: modelName.includes('uncensored'),
            experimental: modelName.includes('experiment'),
          },
          description: model.description || '',
          parameters: null,
          rawData: model,
          isFree: true,
          source: 'openrouter_models',
        });
      });

      // Sort by provider then context length
      models.sort((a, b) => {
        if (a.provider !== b.provider) {
          return a.provider.localeCompare(b.provider);
        }
        return (b.contextLength || 0) - (a.contextLength || 0);
      });

      const aiStudioCount = models.filter(
        m => m.provider === 'aistudio'
      ).length;
      const openRouterCount = models.filter(
        m => m.provider === 'openrouter'
      ).length;

      console.log(
        `📊 Found ${models.length} total models: ${aiStudioCount} AI Studio + ${openRouterCount} FREE OpenRouter`
      );

      return models;
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
  runOrchestration: t.procedure
    .input(
      z.object({
        roles: z
          .array(
            z.object({
              name: z.string(),
              description: z.string(),
            })
          )
          .optional(),
        steps: z.array(
          z.object({
            prompt: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      // Create a volcano-compatible LLM using our OpenRouterAdapter
      const llm = {
        id: 'openrouter-free',
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        client: openRouterAdapter,

        async gen(prompt: string): Promise<string> {
          try {
            const response = await openRouterAdapter.executeChatCompletion({
              model: 'meta-llama/llama-3.2-3b-instruct:free', // Free model
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              maxTokens: 2000,
            });
            return response.choices[0]?.message?.content || '';
          } catch (error) {
            console.error('LLM generation failed:', error);
            return 'Error: Failed to generate response';
          }
        },

        async genWithTools(prompt: string, tools: any[]): Promise<any> {
          // For now, just do basic generation without tools
          // You could extend this to support tool calling if needed
          const content = await this.gen(prompt);
          return {
            content,
            toolCalls: [],
            usage: null,
          };
        },

        async *genStream(
          prompt: string
        ): AsyncGenerator<string, void, unknown> {
          // For now, just yield the full response
          // You could implement streaming if OpenRouterAdapter supports it
          const response = await this.gen(prompt);
          yield response;
        },

        getUsage: () => null, // Optional usage tracking
      };

      const config: OrchestrationConfig = {
        roles: input.roles?.map(role => ({
          ...role,
          agent: agent({
            llm,
            name: role.name,
            description: role.description,
          }),
        })),
        steps: input.steps,
      };

      const orchestration = createOrchestration(config);
      const results = await orchestration.run();
      return results;
    }),
});

// Export the type of the router for the client to use. This is key for end-to-end type safety.
export type AppRouter = typeof appRouter;
