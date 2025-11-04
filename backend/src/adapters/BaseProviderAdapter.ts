/**
 * @file Defines the 'contract' or 'blueprint' that every provider adapter must follow.
 *
 * Why It's Necessary:
 * This is the key to making our system extensible. It allows the `ProviderManager`
 * to manage a `GeminiAdapter`, an `OpenRouterAdapter`, and a future `AnthropicAdapter`
 * using the exact same logic. Without this contract, the `ProviderManager` would need
 * a messy `if/else` block for every provider, making it impossible to maintain.
 *
 * Main Parts:
 * - `interface ProviderAdapter`: The core contract with methods like `checkHealth()`, `fetchAvailableModels()`, and `executeChatCompletion()`.
 */

import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  Model,
  ProviderId,
} from '../types/provider';

/**
 * The interface that all provider adapters must implement.
 */
export interface ProviderAdapter {
  /** A unique identifier for the provider (e.g., 'google', 'openrouter'). */
  readonly id: ProviderId;

  /** Indicates if the adapter is configured and ready to be used. */
  readonly isEnabled: boolean;

  /**
   * Performs a lightweight API call to verify connectivity and authentication.
   */
  checkHealth(): Promise<boolean>;

  /**
   * Fetches the list of models available from the provider's API.
   */
  fetchAvailableModels(): Promise<Model[]>;

  /**
   * Executes a chat completion request using a standardized format.
   */
  executeChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse>;
}
