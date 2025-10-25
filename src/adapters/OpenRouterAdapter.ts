/**
 * @file This is the specific implementation for talking to the OpenRouter API.
 *
 * Why It's Necessary:
 * This adapter acts as a gateway to dozens of models from various providers
 * through a single, unified, OpenAI-compatible API.
 *
 * Main Parts:
 * - `class OpenRouterAdapter`: The concrete class that implements the `ProviderAdapter` interface for OpenRouter.
 */

import { createModuleLogger } from '../utils/logger';
import { getEnv } from '../utils/env';
import { ProviderAdapter } from './BaseProviderAdapter';
import {
  Model,
  ProviderId,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types/provider';
import { ProviderError } from '../errors/customErrors';

const logger = createModuleLogger('OpenRouterAdapter');

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

/**
 * Type definitions for the raw data structures returned by the OpenRouter API.
 */
interface OpenRouterModelData {
  id: string;
  name: string;
  context_length?: number;
  architecture?: {
    instruct_type?: string;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModelData[];
}

interface OpenRouterChatCompletionRawResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterAdapter implements ProviderAdapter {
  readonly id: ProviderId = 'openrouter';
  public isEnabled: boolean;
  private apiKey?: string;

  constructor() {
    this.apiKey = getEnv('OPENROUTER_API_KEY');
    if (!this.apiKey) {
      this.isEnabled = false;
      logger.warn(
        { method: 'constructor', reason: 'API_KEY_MISSING' },
        'OPENROUTER_API_KEY not found. The OpenRouter provider will be disabled.'
      );
    } else {
      this.isEnabled = true;
      logger.info({ method: 'constructor' }, 'OpenRouter provider initialized.');
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled) return false;
    // A simple fetch to the models endpoint serves as a health check.
    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/models`);
      return response.ok;
    } catch (error) {
      logger.error(
        { method: 'checkHealth', provider: this.id, reason: 'API_CALL_FAILED', error },
        'OpenRouter API health check failed.'
      );
      return false;
    }
  }

  async fetchAvailableModels(): Promise<Model[]> {
    if (!this.isEnabled) return [];

    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/models`);
      const responseData = (await response.json()) as OpenRouterModelsResponse;

      return responseData.data.map((m: OpenRouterModelData) => ({
        id: m.id,
        name: m.name,
        apiProvider: this.id,
        // Extract the source provider from the model ID (e.g., "mistralai/mistral-7b" -> "mistralai")
        // This is crucial for provider-specific rate limiting.
        sourceProvider: m.id.split('/')[0],
        contextWindow: m.context_length,
        supportsToolUse: m.architecture?.instruct_type === 'function_calling',
      }));
    } catch (error) {
      logger.error(
        { method: 'fetchAvailableModels', provider: this.id, reason: 'API_CALL_FAILED', error },
        'Failed to fetch models from OpenRouter API.'
      );
      return [];
    }
  }

  async executeChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.isEnabled || !this.apiKey) {
      throw new ProviderError('OpenRouter adapter is not enabled.', this.id);
    }

    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
      }

      const rawData = (await response.json()) as OpenRouterChatCompletionRawResponse;

      // Map the raw snake_case response to our internal camelCase ChatCompletionResponse
      const mappedResponse: ChatCompletionResponse = {
        id: rawData.id,
        model: rawData.model,
        choices: rawData.choices.map(choice => ({
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
        { method: 'executeChatCompletion', provider: this.id, modelId: request.model, reason: 'API_CALL_FAILED', error },
        'Failed to execute chat completion with OpenRouter API.'
      );
      throw new ProviderError(
        `OpenRouter API chat completion failed: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        error
      );
    }
  }
}