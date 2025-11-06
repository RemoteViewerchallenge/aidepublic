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

import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// import { agent } from 'volcano-sdk';
import { createComplexOrchestration } from '../../volcano-sdk/src/orchestration-creator';
import { agent } from '../../volcano-sdk/src/volcano-sdk';
import { AIStudioAdapter } from '../adapters/AIStudioAdapter';
import { GeminiAdapter } from '../adapters/GeminiAdapter';
import { OpenRouterAdapter } from '../adapters/OpenRouterAdapter';
import { ArbitrageEngineAdapter } from '../core/ArbitrageEngineAdapter';
import { ModelSelector } from '../core/ModelSelector';
import { ProviderManager } from '../core/ProviderManager';
import { StateRepository } from '../state/StateRepository';
import { getEnv } from '../utils/env';
import { mcpRouter } from './mcp/mcp';
import { router, publicProcedure } from './trpc';

// --- Application Composition Root ---
// This is where we instantiate and wire together all the core components of our application.
const stateRepository = new StateRepository();
const geminiAdapter = new GeminiAdapter(); // Will be disabled if no key
const openRouterAdapter = new OpenRouterAdapter(); // Will be enabled if key exists
const aiStudioAdapter = new AIStudioAdapter(); // Enabled only when configured

const providerManager = new ProviderManager(
  [geminiAdapter, openRouterAdapter, aiStudioAdapter],
  stateRepository
);
const modelSelector = new ModelSelector();
const arbitrageEngineAdapter = new ArbitrageEngineAdapter(
  providerManager,
  modelSelector
);

// Initialize the ProviderManager to start health checks and load state.
// DISABLED: We use database-based model management instead of real-time API calls
// providerManager.initialize();
// --- End Composition Root ---

export const appRouter = router({
  /**
   * The primary procedure to find the best available free model for a given task.
   * This demonstrates the end-to-end flow of our system.
   */
  getBestModelForTask: publicProcedure
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
      const { default: pool } = await import('../../../db/index.js');
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
      const enabledProviders = providerManager.getEnabledProviderIds();
      const chosenModel = await modelSelector.selectModel(
        {
          minContext: input.criteria?.minContext,
          maxContext: input.criteria?.maxContext,
          toolCalling: input.criteria?.toolCalling,
          vision: input.criteria?.vision,
          reasoning: input.criteria?.reasoning,
          embedding: input.criteria?.embedding,
        },
        {
          allowedProviders: enabledProviders,
          preferredProviderOrder: enabledProviders,
        }
      );

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
  generateContent: publicProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        systemPrompt: z.string().optional(),
        preferredModelId: z.string().optional(),
        blacklistedModelIds: z.array(z.string()).optional(),
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
      // Always prefer free models by default
      const enabledProviders = providerManager.getEnabledProviderIds();
      const chosenModel = await modelSelector.selectModel(
        {
          minContext: input.modelCriteria?.minContext,
          maxContext: input.modelCriteria?.maxContext,
          toolCalling: input.modelCriteria?.toolCalling,
          vision: input.modelCriteria?.vision,
          reasoning: input.modelCriteria?.reasoning,
          embedding: input.modelCriteria?.embedding,
          isFree: true, // Always prioritize free models
        },
        {
          allowedProviders: enabledProviders,
          preferredProviderOrder: enabledProviders,
        }
      );

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

      // 5. Execute the generation with resilient fallback logic.
      const attemptGeneration = async (
        targetAdapter: any,
        targetModelId: string
      ) => {
        const req = { ...chatRequest, model: targetModelId };
        return await targetAdapter.executeChatCompletion(req);
      };

      const isRateLimitError = (err: any) => {
        try {
          const msg = String(err?.message || err || '');
          if (
            msg.includes('status 429') ||
            msg.includes('rate-limited') ||
            msg.includes('429')
          ) {
            return true;
          }

          // Some adapters wrap provider payloads in JSON strings
          if (err?.cause && typeof err.cause === 'object') {
            const causeMsg = JSON.stringify(err.cause);
            if (
              causeMsg.includes('429') ||
              causeMsg.toLowerCase().includes('rate')
            )
              return true;
          }
        } catch (_e) {
          // ignore
        }
        return false;
      };

      try {
        const response = await attemptGeneration(adapter, chosenModel.id);
        // Increment use_point for the successfully used model
        const { default: pool } = await import('../../../db/index.js');
        await pool.query(
          'UPDATE models SET use_point = use_point + 1 WHERE id = $1',
          [chosenModel.id]
        );
        return {
          content: response.choices[0]?.message?.content || '',
          model: response.model,
          usage: response.usage,
          providerId: chosenModel.apiProvider,
          modelId: chosenModel.id,
        };
      } catch (_error: any) {
        // Check if this is the "Developer instruction is not enabled" error
        const errorMessage = String(_error?.message || _error || '');
        if (errorMessage.includes('Developer instruction is not enabled')) {
          console.warn(
            `🚫 Blacklisting model ${chosenModel.id} due to developer instruction error`
          );
          // Blacklist the model
          const { default: pool } = await import('../../../db/index.js');
          await pool.query(
            'UPDATE models SET blacklisted = TRUE WHERE id = $1',
            [chosenModel.id]
          );
        }

        // If this is a rate-limit from the upstream provider, try to route to another provider/model.
        if (isRateLimitError(_error)) {
          console.warn(
            '⚠️ Generation failed due to rate-limit, attempting failover...',
            _error?.message || _error
          );

          // 1) Try alternative providers first (exclude the failing provider)
          try {
            const enabled = providerManager
              .getEnabledProviderIds()
              .filter(id => id !== chosenModel.apiProvider);
            if (enabled.length > 0) {
              const altModel = await modelSelector.selectModel(
                {
                  minContext: input.modelCriteria?.minContext,
                  maxContext: input.modelCriteria?.maxContext,
                  toolCalling: input.modelCriteria?.toolCalling,
                  vision: input.modelCriteria?.vision,
                  reasoning: input.modelCriteria?.reasoning,
                  embedding: input.modelCriteria?.embedding,
                  isFree: true,
                },
                {
                  allowedProviders: enabled,
                  preferredProviderOrder: enabled,
                }
              );

              if (altModel) {
                const altAdapter = providerManager.getAdapter(
                  altModel.apiProvider
                );
                if (altAdapter) {
                  try {
                    const altResp = await attemptGeneration(
                      altAdapter,
                      altModel.id
                    );
                    // Increment use_point for the successfully used alternative model
                    const { default: pool } = await import(
                      '../../../db/index.js'
                    );
                    await pool.query(
                      'UPDATE models SET use_point = use_point + 1 WHERE id = $1',
                      [altModel.id]
                    );
                    return {
                      content: altResp.choices[0]?.message?.content || '',
                      model: altResp.model,
                      usage: altResp.usage,
                      providerId: altModel.apiProvider,
                      modelId: altModel.id,
                    };
                  } catch (altErr) {
                    console.warn(
                      '⚠️ Alternative provider attempt failed:',
                      String(altErr)
                    );
                    // fallthrough to next fallback
                  }
                }
              }
            }
          } catch (_e) {
            console.warn(
              'Failed to attempt alternative provider selection',
              _e
            );
          }

          // mark the failing provider on cooldown so subsequent requests avoid it briefly
          try {
            const COOLDOWN_MS = 60_000; // 60s
            // chosenModel.apiProvider may be undefined; guard
            if (
              chosenModel &&
              chosenModel.apiProvider &&
              typeof providerManager.markProviderCooldown === 'function'
            ) {
              providerManager.markProviderCooldown(
                chosenModel.apiProvider,
                COOLDOWN_MS
              );
            }
          } catch (_e) {
            console.warn('Failed to mark provider cooldown', _e);
          }

          // 2) If no other provider worked, try another model from the same provider (different model id)
          try {
            const allModels = await providerManager.getAvailableModels(true);
            const candidates = allModels.filter(
              m =>
                m.apiProvider === chosenModel.apiProvider &&
                m.id !== chosenModel.id
            );
            for (const candidate of candidates) {
              const sameAdapter = providerManager.getAdapter(
                candidate.apiProvider
              );
              if (!sameAdapter) continue;
              try {
                const candResp = await attemptGeneration(
                  sameAdapter,
                  candidate.id
                );
                // Increment use_point for the successfully used candidate model
                const { default: pool } = await import('../../../db/index.js');
                await pool.query(
                  'UPDATE models SET use_point = use_point + 1 WHERE id = $1',
                  [candidate.id]
                );
                return {
                  content: candResp.choices[0]?.message?.content || '',
                  model: candResp.model,
                  usage: candResp.usage,
                  providerId: candidate.apiProvider,
                  modelId: candidate.id,
                };
              } catch (candErr) {
                // try next candidate
                console.warn(
                  'Candidate model failed, trying next:',
                  candidate.id,
                  String(candErr)
                );
                continue;
              }
            }
          } catch (_e) {
            console.warn(
              'Failed to fetch alternative models from providerManager',
              _e
            );
          }
        }

        // If we reached here, no fallback succeeded. Re-throw with original error context.
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Generation failed: ${_error?.message}`,
          cause: _error,
        });
      }
    }),

  /**
   * Get all available models with their current health status.
   */
  getAvailableModels: publicProcedure.query(async () => {
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
  getModelsFromDatabase: publicProcedure.query(async () => {
    try {
      // Import the pool here to avoid circular dependencies
      const { default: pool } = await import('../../../db/index.js');

      const result = await pool.query(`
        SELECT * FROM models
        ORDER BY provider, context_length DESC
      `);

      const models = result.rows.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        contextLength: model.context_length,
        capabilities: {
          toolCalling: model.tool_calling,
          vision: model.vision,
          reasoning: model.reasoning,
          embedding: model.embedding,
          uncensored: (model.name || '').toLowerCase().includes('uncensored'),
          experimental: (model.name || '').toLowerCase().includes('experiment'),
        },
        description: model.description || '',
        parameters: null,
        rawData: model.raw_data,
        isFree: true, // Assuming all models in the unified table are free for now
        source: model.provider,
      }));

      console.log(
        `📊 Found ${models.length} total models from the unified table`
      );

      return models;
    } catch (_error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch models from database: ${_error?.message}`,
      });
    }
  }),

  /**_
   * Runs a simple, single-step agent workflow to verify end-to-end integration.
   */
  // runAgentTask: publicProcedure
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
  runShellCommand: publicProcedure
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
      } catch (_error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to connect to Shell MCP at ${shellMcpUrl}. Reason: ${_error?.message}`,
          cause: _error,
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
  runOrchestration: publicProcedure
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
            pattern: z
              .enum([
                'sequential',
                'parallel',
                'branch',
                'retry',
                'while',
                'forEach',
                'switch',
              ])
              .optional()
              .default('sequential'),
            patternConfig: z.any().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Use our existing ArbitrageEngineAdapter as the LLM for volcano orchestration
        const llm = arbitrageEngineAdapter;

        // Ensure steps are of type ComplexStep[]
        const complexSteps = input.steps.map(step => ({
          prompt: step.prompt,
          pattern: step.pattern,
          patternConfig: step.patternConfig,
        }));

        const config = {
          roles: input.roles?.map(role => ({
            // ensure we only supply the fields expected by Volcano's Role type
            name: role.name,
            description: role.description,
            agent: agent({
              llm,
              name: role.name,
              description: role.description,
            }),
          })),
          steps: complexSteps,
        };

        // Create orchestration with pattern support
        const orchestration = createComplexOrchestration(config, llm);
        const results = await orchestration.run();

        return {
          success: true,
          results,
          timestamp: new Date().toISOString(),
          stepCount: input.steps.length,
          patterns: input.steps.map(s => s.pattern || 'sequential'),
        };
      } catch (_error: any) {
        console.error('Orchestration failed:', _error);
        return {
          success: false,
          error: _error?.message,
          timestamp: new Date().toISOString(),
        };
      }
    }),

  getProviderStatus: publicProcedure.query(() => {
    return {
      gemini: new GeminiAdapter().isEnabled,
      openrouter: new OpenRouterAdapter().isEnabled,
      aistudio: new AIStudioAdapter().isEnabled,
    };
  }),
  mcp: mcpRouter,
});

// Export the type of the router for the client to use. This is key for end-to-end type safety.
export type AppRouter = typeof appRouter;