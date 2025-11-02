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

import { createModuleLogger } from '../utils/logger.js';
import { ModelSelector } from './ModelSelector.js';
import { ProviderManager } from './ProviderManager.js';

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

    // 1. Get all healthy, available models from our engine.
    const availableModels = await this.providerManager.getAvailableModels();

    // 2. Use our "brain" (ModelSelector) to select the best model for the given prompt.
    const bestModel = this.modelSelector.selectBestModel(
      availableModels,
      prompt
    );

    if (!bestModel) {
      logger.error(
        { method: 'gen', prompt: prompt },
        'No suitable model found by the Arbitrage Engine.' as string
      );
      throw new Error('No suitable model available to handle the request.');
    }

    // 3. Find the correct provider adapter (e.g., OpenRouterAdapter) to use for the selected model.
    const adapterToUse = this.providerManager.getAdapter(bestModel.apiProvider);
    if (!adapterToUse) {
      logger.error(
        {
          method: 'gen',
          modelId: bestModel.id,
          apiProvider: bestModel.apiProvider,
        },
        'Could not find a configured adapter for the selected model.' as string
      );
      throw new Error(
        `Adapter not found for provider: ${bestModel.apiProvider}`
      );
    }

    // 4. Execute the call using the chosen adapter.
    try {
      const response = await adapterToUse.executeChatCompletion({
        model: bestModel.id,
        messages: [{ role: 'user', content: prompt }],
      });

      // 5. Transform our internal ChatCompletionResponse into the LlmExecuteResult format that Volcano expects.
      const result: LlmResult = {
        llmOutput: response.choices[0]?.message.content || '',
        usage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        },
        model: bestModel.id,
        // Add the missing property that Volcano expects.
        toolCalls: [],
      };

      logger.info(
        { method: 'gen', modelUsed: bestModel.id },
        'Arbitrage Engine execution complete.'
      );
      return result.llmOutput;
    } catch (error) {
      logger.error(
        { method: 'gen', modelId: bestModel.id, error },
        'Error during chat completion execution.' as string
      );
      // Re-throw the error so it can be handled by the tRPC layer.
      throw error;
    }
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
