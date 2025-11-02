/**
 * @file This is the specific implementation for talking to Google's AI services.
 *
 * Why It's Necessary:
 * This is our "last mile" connection to a real AI service. It translates our
 * system's generic requests into the specific format Google's API understands.
 * Without concrete adapters like this, our system is just a theoretical engine.
 *
 * Main Parts:
 * - `class GeminiAdapter`: The concrete class that implements the `ProviderAdapter` interface for Google.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProviderError } from '../core/customErrors';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  Model,
  ProviderId,
} from '../types/provider';
import { getEnv } from '../utils/env';
import { createModuleLogger } from '../utils/logger';
import { ProviderAdapter } from './BaseProviderAdapter';

const logger = createModuleLogger('GeminiAdapter');

interface GeminiApiModel {
  name: string;
  displayName?: string;
  inputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

export class GeminiAdapter implements ProviderAdapter {
  readonly id: ProviderId = 'google';
  public isEnabled: boolean;
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = getEnv('GEMINI_API_KEY');
    if (!apiKey) {
      this.isEnabled = false;
      logger.warn(
        { method: 'constructor', reason: 'API_KEY_MISSING' },
        'GEMINI_API_KEY not found. The Gemini provider will be disabled.'
      );
    } else {
      this.isEnabled = true;
      this.client = new GoogleGenerativeAI(apiKey);
      logger.info({ method: 'constructor' }, 'Gemini provider initialized.');
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled || !this.client) return false;

    try {
      // Use a lightweight, low-cost API call to verify connectivity and authentication.
      await (this.client as any).models.list();
      return true;
    } catch (error) {
      logger.error(
        {
          method: 'checkHealth',
          provider: this.id,
          reason: 'API_CALL_FAILED',
          error,
        },
        'Gemini API health check failed.' as string
      );
      return false;
    }
  }

  async fetchAvailableModels(): Promise<Model[]> {
    if (!this.isEnabled || !this.client) return [];

    try {
      const { models } = await (this.client as any).models.list();
      return models.map((m: GeminiApiModel) => ({
        id: m.name,
        name: m.displayName || m.name,
        apiProvider: this.id,
        sourceProvider: this.id, // For a direct adapter, apiProvider and sourceProvider are the same.
        contextWindow: m.inputTokenLimit,
        // The Gemini API does not directly expose a 'supportsToolUse' field
        // We'll assume models with 'functionCalling' capability support tool use.
        supportsToolUse:
          m.supportedGenerationMethods?.includes('functionCalling'),
        // Gemini models are not free.
        isFree: false,
      }));
    } catch (error) {
      logger.error(
        {
          method: 'fetchAvailableModels',
          provider: this.id,
          reason: 'API_CALL_FAILED',
          error,
        },
        'Failed to fetch models from Gemini API.' as string
      );
      return [];
    }
  }

  async executeChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.isEnabled || !this.client) {
      throw new ProviderError('Gemini adapter is not enabled.', this.id);
    }

    try {
      // The Gemini API requires alternating user and model roles.
      // We also need to handle the 'system' role separately.
      const systemInstruction = request.messages.find(
        msg => msg.role === 'system'
      );
      const contents = request.messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));

      // Get a specific model instance from the client
      const model = this.client.getGenerativeModel({
        model: request.model,
        systemInstruction: systemInstruction?.content,
      });

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
        },
      });

      const response = result.response;
      const text = response.text();

      // The v0.12.0 SDK provides token counts directly in the response.
      const usage = {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      };

      return {
        id: `gemini-response-${Date.now()}`, // The SDK doesn't provide a top-level ID
        model: request.model,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: text },
            finishReason: response.candidates?.[0]?.finishReason || 'STOP',
          },
        ],
        usage,
      };
    } catch (error) {
      logger.error(
        {
          method: 'executeChatCompletion',
          provider: this.id,
          reason: 'API_CALL_FAILED',
          error,
        },
        'Failed to execute chat completion with Gemini API.' as string
      );
      throw new ProviderError(
        `Gemini API chat completion failed: ${(error as Error).message}`,
        this.id,
        error
      );
    }
  }
}
