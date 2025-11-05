
import { ProviderAdapter } from './BaseProviderAdapter';
import { Model, ChatCompletionRequest, ChatCompletionResponse, ProviderId } from '../types/provider';
import { getEnv } from '../utils/env';
import { createModuleLogger } from '../utils/logger';
import { ApiError, ProviderError } from '../core/customErrors';

const logger = createModuleLogger('TogetherAdapter');

const TOGETHER_API_BASE = 'https://api.together.xyz/v1';

interface TogetherModel {
  id: string;
  name: string;
  context_length: number;
  [key: string]: any; // Capture any other fields
}

export class TogetherAdapter implements ProviderAdapter {
  readonly id: ProviderId = 'together';
  public isEnabled: boolean;
  private apiKey?: string;

  constructor() {
    this.apiKey = getEnv('TOGETHER_API_KEY');
    if (!this.apiKey) {
      this.isEnabled = false;
      logger.warn(
        { method: 'constructor', reason: 'API_KEY_MISSING' },
        'TOGETHER_API_KEY not found. The Together provider will be disabled.'
      );
    } else {
      this.isEnabled = true;
      logger.info(
        { method: 'constructor' },
        'Together provider initialized.'
      );
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled) return false;
    try {
      const response = await fetch(`${TOGETHER_API_BASE}/models`, {
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
        'Together API health check failed.'
      );
      return false;
    }
  }

  async fetchAvailableModels(): Promise<Model[]> {
    if (!this.isEnabled) return [];
    try {
      const response = await fetch(`${TOGETHER_API_BASE}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new ApiError('Failed to fetch models from Together AI', this.id, response.status, await response.text());
      }

      const modelsData: TogetherModel[] = await response.json();

      return modelsData.map(m => ({
        id: m.id,
        name: m.name,
        apiProvider: this.id,
        contextWindow: m.context_length,
        isFree: false, // Assuming models are not free unless specified
        supportsToolUse: false, // Assuming no tool use unless specified
        ...m, // Pass through all original fields
      }));
    } catch (error) {
      logger.error(
        {
          method: 'fetchAvailableModels',
          provider: this.id,
          reason: 'API_CALL_FAILED',
          error,
        },
        'Failed to fetch models from Together AI API.'
      );
      return [];
    }
  }

  async executeChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.isEnabled || !this.apiKey) {
      throw new ProviderError('Together adapter is not enabled.', this.id);
    }

    try {
      const payload = {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      };

      const response = await fetch(`${TOGETHER_API_BASE}/chat/completions`, {
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
        'Failed to execute chat completion with Together AI API.'
      );
      throw new ProviderError(
        `Together AI API chat completion failed: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        error
      );
    }
  }
}
