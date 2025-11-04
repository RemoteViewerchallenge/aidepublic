/**
 * @file Defines the core data structures related to providers and models.
 *
 * Main Values Passed:
 * This file defines TypeScript `interfaces` and `types` like `Model`, `HealthStatus`,
 * `ProviderState`, and `QuotaInfo`.
 *
 * Why It's Necessary:
 * This provides a single source of truth for our data shapes. It ensures that the
 * `ProviderManager` and the `GeminiAdapter` agree on what a "model" object looks like,
 * preventing bugs and enabling TypeScript's powerful static analysis.
 *
 * Main Parts:
 * - `interface Model`, `type HealthStatus`, `interface ProviderState`: The exported data structures.
 */

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

// For our initial implementation, we are focusing only on Google.
// The `| string` allows for future extensibility from a config file
// without requiring a breaking change to this type.
export type ProviderId = 'google' | 'openrouter' | string;

/**
 * Represents a single large language model available from a provider.
 */
export interface Model extends Record<string, any> {
  id: string;
  name: string; // Human-readable name, e.g., "Mistral 7B Instruct"
  apiProvider: ProviderId; // The adapter used to call this model, e.g., 'openrouter'
  sourceProvider: string; // The original source of the model, e.g., 'mistralai', 'google'
  contextWindow?: number;
  supportsToolUse?: boolean;
  isFree?: boolean;
}

/**
 * Standardized request format for chat completions.
 * This creates a common language for all providers.
 */
export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Standardized response format for chat completions.
 */
export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string };
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}