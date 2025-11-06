/**
 * @file LEGACY: ArbitrageEngineAdapter for Volcano.dev Integration
 *
 * ⚠️ DEPRECATED: As of November 2025, the system primarily uses direct database access
 * for model management via src/scripts/sync-models.ts for improved performance.
 *
 * This adapter is maintained for:
 * - Backward compatibility with existing Volcano.dev workflows
 * - Real-time provider health checking scenarios
 * - Custom dynamic model selection use cases
 *
 * For new development, prefer direct database queries. See docs/Architecture-Update.md
 *
 * @description This class acts as the critical "bridge" that connects the `volcano.dev`
 * orchestration framework to our custom **Arbitrage Engine**. It implements Volcano's
 * `Llm` interface, allowing any Volcano workflow to use our engine as its source of LLM power.
 *
 * Why It's Necessary:
 * Volcano.dev has its own interface for what it considers an "LLM". This class
 * implements that interface, but instead of talking to a single provider, it
 * It's the bridge between the Volcano orchestrator and our custom engine.
 *
 * Main Parts:
 * - `class ArbitrageEngineAdapter`: Implements Volcano's `Llm` interface.
 *
 * Key Methods:
 * - `async execute(options: LlmExecuteOptions): Promise<LlmExecuteResult>`
 */

import { createModuleLogger } from '../utils/logger';

import type { ModelSelector } from './ModelSelector.js';
import type { ProviderManager } from './ProviderManager.js';

const logger = createModuleLogger('ArbitrageEngineAdapter');

/**
 * Defines the contract for an LLM provider that can be used with Volcano.
 * This is our internal definition based on the expected shape from volcano.dev docs.
 */
export interface LlmOptions {
  prompt: string;
  [key: string]: any; // Allow other options
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  mcpHandle?: any;
}

export interface LlmResult {
  llmOutput: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls: ToolCall[];
  [key: string]: any; // Allow other result properties
}

export interface Llm {
  gen(options: LlmOptions | string): Promise<string>;
}

export class ArbitrageEngineAdapter implements Llm {
  private providerManager: ProviderManager;
  private modelSelector: ModelSelector;

  public readonly id = 'arbitrage-engine';
  public readonly model = '';
  public readonly client = null;

  /**
   * @param providerManager - The singleton instance of our main engine.
   * @param modelSelector - The singleton instance of our selection logic "brain".
   */
  constructor(providerManager: ProviderManager, modelSelector: ModelSelector) {
    this.providerManager = providerManager;
    this.modelSelector = modelSelector;
  }

  /**
   * Executes a request from a Volcano workflow by orchestrating our entire engine.
   */
  public async gen(options: LlmOptions | string): Promise<string> {
    // --- RESILIENCE FIX ---
    // The volcano-sdk's internal structure is not explicitly typed for us.
    // This logic handles both cases: where Volcano sends a raw string, or an options object.
    let prompt: string | undefined;
    if (typeof options === 'string') {
      prompt = options;
    } else if (typeof options === 'object' && options !== null) {
      prompt = options.prompt || options.messages?.[0]?.content;
    }

    if (!prompt) {
      logger.error(
        { method: 'gen', optionsReceived: options },
        'Could not extract a valid prompt from the options provided by Volcano.' as string
      );
      throw new Error(
        'ArbitrageEngineAdapter received a request from Volcano with no valid prompt.'
      );
    }
    // --- END RESILIENCE FIX ---

    logger.info(
      { method: 'gen', prompt: prompt },
      'Executing request via Arbitrage Engine.'
    );

    // Get all available models, shuffled randomly. This aligns with the main router's philosophy.
    const enabledProviders = this.providerManager.getEnabledProviderIds();
    const candidates = await this.modelSelector.selectModel(
      {
        isFree: true, // Default to free models for Volcano tasks
      },
      {
        allowedProviders: enabledProviders,
      }
    );

    if (!candidates || candidates.length === 0) {
      throw new Error('No candidate models available to handle the request.');
    }

    // --- Resilient Generation Loop ---
    // This is the same "try-every-missile" loop from router.ts
    for (const model of candidates) {
      try {
        const adapter = this.providerManager.getAdapter(model.apiProvider);
        if (!adapter) {
          logger.warn(`No adapter for provider: ${model.apiProvider}`);
          continue;
        }

        const response = await adapter.executeChatCompletion({
          model: model.id,
          messages: [{ role: 'user', content: prompt }],
        });

        const llmOutput = response.choices[0]?.message.content || '';
        if (llmOutput) {
          logger.info(
            { method: 'gen', modelUsed: model.id },
            'Arbitrage Engine execution complete.'
          );
          return llmOutput;
        }
        // If we got an empty response, log it and try the next model.
        logger.warn(`Empty response from model ${model.id}. Trying next...`);
      } catch (error) {
        logger.warn(
          `Model ${model.id} failed. Trying next...`,
          (error as Error).message
        );
        this.providerManager.markProviderCooldown(model.apiProvider, 60000);
      }
    }

    // If the loop finishes without success, throw an error.
    throw new Error('Execution failed after trying all available models.');
  }

  public async genWithTools(options: LlmOptions | string): Promise<LlmResult> {
    // For now, this is a simple pass-through. In the future, we could add tool-specific logic here.
    const llmOutput = await this.gen(options);
    return { llmOutput, toolCalls: [] };
  }

  public async *genStream(
    options: LlmOptions | string
  ): AsyncGenerator<string, void, unknown> {
    // This is a mock implementation. A real implementation would need to handle streaming responses.
    const result = await this.gen(options);
    yield result;
  }
}
