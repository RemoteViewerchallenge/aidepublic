
import { ProviderAdapter } from './BaseProviderAdapter';
import { Model, ChatCompletionRequest, ChatCompletionResponse, ProviderId } from '../types/provider';
import { getEnv } from '../utils/env';
import { createModuleLogger } from '../utils/logger';
import { ApiError, ProviderError } from '../core/customErrors';

const logger = createModuleLogger('GroqAdapter');

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  [key: string]: any;
}

export class GroqAdapter implements ProviderAdapter {
  readonly id: ProviderId = 'groq';
  public isEnabled: boolean;
  private apiKey?: string;

  constructor() {
    this.apiKey = getEnv('GROQ_API_KEY');
    if (!this.apiKey) {
      this.isEnabled = false;
      logger.warn(
        { method: 'constructor', reason: 'API_KEY_MISSING' },
        'GROQ_API_KEY not found. The Groq provider will be disabled.'
      );
    } else {
      this.isEnabled = true;
      logger.info(
        { method: 'constructor' },
        'Groq provider initialized.'
      );
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled) return false;
    try {
      const response = await fetch(`${GROQ_API_BASE}/models`, {
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
        'Groq API health check failed.'
      );
      return false;
    }
  }

  async fetchAvailableModels(): Promise<Model[]> {
    if (!this.isEnabled) return [];
    try {
      const response = await fetch(`${GROQ_API_BASE}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new ApiError('Failed to fetch models from Groq', this.id, response.status, await response.text());
      }

      const modelsData: { data: GroqModel[] } = await response.json();

      return modelsData.data.map(m => ({
        id: m.id,
        name: m.id, // Groq API doesn't provide a separate 'name' field
        apiProvider: this.id,
        contextWindow: m.context_window || 8192, // Default to 8k if not provided
        isFree: true, // Assuming all Groq models are currently free
        supportsToolUse: true, // Assuming tool use is supported
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
        'Failed to fetch models from Groq API.'
      );
      return [];
    }
  }

  async executeChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.isEnabled || !this.apiKey) {
      throw new ProviderError('Groq adapter is not enabled.', this.id);
    }

    try {
      const payload = {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      };

      const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
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
        'Failed to execute chat completion with Groq API.'
      );
      throw new ProviderError(
        `Groq API chat completion failed: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        error
      );
    }
  }
}
