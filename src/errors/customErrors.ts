/**
 * @file Defines all the custom error types for our application.
 *
 * Main Values Passed:
 * This file defines error classes like `ProviderError`, `ValidationError`, etc.
 *
 * Why It's Necessary:
 * As required by our coding rules, using custom errors allows us to programmatically
 * distinguish between different failure modes (e.g., a network error vs. bad input)
 * and handle them appropriately, which is more robust than just checking error messages.
 *
 * Main Parts:
 * - `class ProviderError`, `class ValidationError`, `class StateError`: The exported error classes.
 */

/**
 * Base error for state-related failures.
 */
export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}

export class StateReadError extends StateError {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'StateReadError';
  }
}

/**
 * Represents an error originating from a provider adapter.
 */
export class ProviderError extends Error {
  constructor(message: string, public providerId: string, public originalError?: unknown) {
    super(message);
    this.name = 'ProviderError';
  }
}