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

import { ApiError, ProviderError } from '../errors/customErrors';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  Model,
  ProviderId,
} from '../types/provider';
import { getEnv } from '../utils/env';
import { createModuleLogger } from '../utils/logger';
import { ProviderAdapter } from './BaseProviderAdapter';

const logger = createModuleLogger('OpenRouterAdapter');

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

/**
 * Type definitions for the raw data structures returned by the OpenRouter API.
 */
interface OpenRouterModelsResponse {
  // We use a generic Record to capture all available data from the API,
  // rather than enforcing a strict, limited schema.
  data: Record<string, any>[];
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
      logger.info(
        { method: 'constructor' },
        'OpenRouter provider initialized.'
      );
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled) return false;
    // A simple fetch to the models endpoint serves as a health check.
    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      if (!response.ok) {
        logger.error(
          {
            method: 'checkHealth',
            provider: this.id,
            status: response.status,
            statusText: response.statusText,
          },
          'OpenRouter API health check failed with non-OK status.' as string
        );
      }
      return response.ok;
    } catch (error) {
      logger.error(
        {
          method: 'checkHealth',
          provider: this.id,
          reason: 'API_CALL_FAILED',
          error,
        },
        'OpenRouter API health check failed.' as string
      );
      return false;
    }
  }

  async fetchAvailableModels(): Promise<Model[]> {
    if (!this.isEnabled) return [];

    try {
      const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      const responseData = (await response.json()) as OpenRouterModelsResponse;

      // --- For debugging: Save the raw API response to a file ---
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const outputPath = path.resolve(
          process.cwd(),
          'data',
          'openrouter-models-raw.json'
        );
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, JSON.stringify(responseData, null, 2));
        logger.info(
          { method: 'fetchAvailableModels', path: outputPath },
          'Successfully saved raw OpenRouter models response to file.' as string
        );
      } catch (writeError) {
        logger.error(
          { method: 'fetchAvailableModels', error: writeError },
          'Failed to save raw OpenRouter models response.' as string
        );
      }
      // --- End debugging code ---

      const models = responseData.data.map((m: Record<string, any>) => {
        const isFree = m.pricing
          ? Object.values(m.pricing).every(price => price === '0')
          : m.id.endsWith(':free');

        return {
          ...m, // Pass through all original fields from the API
          id: m.id,
          name: m.name,
          apiProvider: this.id,
          sourceProvider: m.id.split('/'),
          contextWindow: m.context_length || m.max_context_length,
          isFree,
          supportsToolUse:
            m.architecture?.instruct_type === 'function_calling' ||
            m.architecture?.tool_use === true,
        };
      });

      // Sort models to prioritize free ones
      models.sort((a, b) => (b.isFree ? 1 : 0) - (a.isFree ? 1 : 0));

      return models;
    } catch (error) {
      logger.error(
        {
          method: 'fetchAvailableModels',
          provider: this.id,
          reason: 'API_CALL_FAILED',
          error,
        },
        'Failed to fetch models from OpenRouter API.' as string
      );
      return [];
    }
  }

  async executeChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.isEnabled || !this.apiKey) {
      throw new ProviderError('OpenRouter adapter is not enabled.', this.id);
    }

    try {
      const payload = {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      };

      logger.info(
        {
          method: 'executeChatCompletion',
          provider: this.id,
          modelId: request.model,
          messageCount: request.messages.length,
          promptPreview:
            request.messages[request.messages.length - 1]?.content?.slice(
              0,
              200
            ) || 'no-prompt',
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        },
        'Dispatching OpenRouter chat completion request.' as string
      );

      const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      logger.info(
        {
          method: 'executeChatCompletion',
          provider: this.id,
          modelId: request.model,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          rawResponsePreview: responseText.slice(0, 400),
        },
        'Received OpenRouter response.' as string
      );

      if (!response.ok) {
        const message = `API request failed with status ${response.status}: ${responseText}`;
        throw new ApiError(message, this.id, response.status, responseText);
      }

      // Parse the response text as JSON
      const rawData: OpenRouterChatCompletionRawResponse =
        JSON.parse(responseText);

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
        {
          method: 'executeChatCompletion',
          provider: this.id,
          modelId: request.model,
          reason: 'API_CALL_FAILED',
          error,
        },
        'Failed to execute chat completion with OpenRouter API.' as string
      );
      throw new ProviderError(
        `OpenRouter API chat completion failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        this.id,
        error
      );
    }
  }
}
