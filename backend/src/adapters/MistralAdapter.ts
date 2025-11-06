
import { ProviderAdapter } from './BaseProviderAdapter';
import { Model, ChatCompletionRequest, ChatCompletionResponse, ProviderId } from '../types/provider';
import { getEnv } from '../utils/env';
import { createModuleLogger } from '../utils/logger';
import { ApiError, ProviderError } from '../core/customErrors';

const logger = createModuleLogger('MistralAdapter');

const MISTRAL_API_BASE = 'https://api.mistral.ai/v1';

interface MistralModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  [key: string]: any;
}

export class MistralAdapter implements ProviderAdapter {
  readonly id: ProviderId = 'mistral';
  public isEnabled: boolean;
  private apiKey?: string;

  constructor() {
    this.apiKey = getEnv('MISTRAL_API_KEY');
    if (!this.apiKey) {
      this.isEnabled = false;
      logger.warn(
        { method: 'constructor', reason: 'API_KEY_MISSING' },
        'MISTRAL_API_KEY not found. The Mistral provider will be disabled.'
      );
    } else {
      this.isEnabled = true;
      logger.info(
        { method: 'constructor' },
        'Mistral provider initialized.'
      );
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled) return false;
    try {
      const response = await fetch(`${MISTRAL_API_BASE}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      logger.error(
        {
          method: 'checkHealth',
          provider: this.id,
          reason: 'API_CALL_FAILED',
          error,
        },
        'Mistral API health check failed.'
      );
      return false;
    }
  }

  async fetchAvailableModels(): Promise<Model[]> {
    if (!this.isEnabled) return [];
    try {
      const response = await fetch(`${MISTRAL_API_BASE}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new ApiError('Failed to fetch models from Mistral', this.id, response.status, await response.text());
      }

      const modelsData: { data: MistralModel[] } = await response.json();

      return modelsData.data.map(m => ({
        id: m.id,
        name: m.id,
        apiProvider: this.id,
        contextWindow: m.context_window || 8192,
        isFree: false, // Mistral models are not free
        supportsToolUse: true, // Assuming tool use is supported
        ...m,
      }));
    } catch (error) {
      logger.error(
        {
          method: 'fetchAvailableModels',
          provider: this.id,
          reason: 'API_CALL_FAILED',
          error,
        },
        'Failed to fetch models from Mistral API.'
      );
      return [];
    }
  }

  async executeChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.isEnabled || !this.apiKey) {
      throw new ProviderError('Mistral adapter is not enabled.', this.id);
    }

    try {
      const payload = {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      };

      const response = await fetch(`${MISTRAL_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new ApiError(`API request failed with status ${response.status}: ${responseText}`, this.id, response.status, responseText);
      }

      const rawData = JSON.parse(responseText);

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
        'Failed to execute chat completion with Mistral API.'
      );
      throw new ProviderError(
        `Mistral API chat completion failed: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        error
      );
    }
  }
}
