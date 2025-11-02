/**
 * @file This is the specific implementation for talking to the AI.Studio API.
 *
 * Why It's Necessary:
 * This adapter acts as a gateway to AI.Studio models, allowing the Arbitrage Engine
 * to leverage them for various tasks.
 *
 * Main Parts:
 * - `class AIStudioAdapter`: The concrete class that implements the `ProviderAdapter` interface for AI.Studio.
 */

import pool from '../db/index.js';
import { ProviderError } from '../errors/customErrors.js';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  Model,
  ProviderId,
} from '../types/provider.js';
import { getEnv } from '../utils/env.js';
import { ProviderAdapter } from './BaseProviderAdapter.js';

function createModuleLogger(moduleName: string) {
  return {
    info: (...args: any[]) => console.info(`[${moduleName}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${moduleName}]`, ...args),
    error: (...args: any[]) => console.error(`[${moduleName}]`, ...args),
    debug: (...args: any[]) => console.debug(`[${moduleName}]`, ...args),
  };
}

const logger = createModuleLogger('AIStudioAdapter');

const AISTUDIO_API_BASE = 'https://api.ai.studio/v1';

export class AIStudioAdapter implements ProviderAdapter {
  readonly id: ProviderId = 'aistudio';
  public isEnabled: boolean;
  private apiKey?: string;

  constructor() {
    this.apiKey = getEnv('AI_STUDIO_API_KEY');
    if (!this.apiKey) {
      this.isEnabled = false;
      logger.warn(
        { method: 'constructor', reason: 'API_KEY_MISSING' },
        'AI_STUDIO_API_KEY not found. The AI.Studio provider will be disabled.'
      );
    } else {
      this.isEnabled = true;
      logger.info({ method: 'constructor' }, 'AI.Studio provider initialized.');
    }
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }

  async fetchAvailableModels(): Promise<Model[]> {
    if (!this.isEnabled) return [];
    let client;
    try {
      client = await pool.connect();
      const result = await client.query('SELECT * FROM ai_studio_models');
      const models = result.rows;

      return models
        .filter((m: any) =>
          m.supportedGenerationMethods?.includes('generateContent')
        )
        .map((m: any) => ({
          id: m.id,
          name: m.displayName || m.id.replace('models/', ''),
          description: m.description,
          apiProvider: this.id,
          sourceProvider: 'google',
          contextWindow: m.inputTokenLimit,
          supportsToolUse: m.supportedGenerationMethods?.includes('toolUse'),
          isFree: false,
        }));
    } catch (error) {
      logger.error(
        { method: 'fetchAvailableModels', error },
        'Failed to fetch models from the database.'
      );
      return [];
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async executeChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.isEnabled || !this.apiKey) {
      throw new ProviderError('AI.Studio adapter is not enabled.', this.id);
    }

    try {
      const response = await fetch(`${AISTUDIO_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorBody}`
        );
      }

      const rawData = await response.json();

      // Map the raw response to our internal ChatCompletionResponse
      const mappedResponse: ChatCompletionResponse = {
        id: rawData.id,
        model: rawData.model,
        choices: rawData.choices.map((choice: any) => ({
          index: choice.index,
          message: choice.message,
          finishReason: choice.finish_reason,
        })),
        usage: {
          promptTokens: rawData.usage.prompt_tokens,
          completionTokens: rawData.usage.completion_tokens,
          totalTokens: rawData.usage.total_tokens,
        },
      };
      return mappedResponse;
    } catch (error) {
      logger.error(
        {
          method: 'executeChatCompletion',
          provider: this.id,
          modelId: request.model,
          reason: 'API_CALL_FAILED',
          error,
        },
        'Failed to execute chat completion with AI.Studio API.' as string
      );
      throw new ProviderError(
        `AI.Studio API chat completion failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        this.id,
        error
      );
    }
  }
}
