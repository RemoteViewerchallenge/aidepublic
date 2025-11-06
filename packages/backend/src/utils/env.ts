/**
 * @file Contains a utility to ensure critical environment variables are set.
 * @file Contains a utility to gracefully access environment variables.
 *
 * Main Values Passed:
 * The `getEnv` function takes a `variable name` (string) and returns its `value`
 * if it exists, or `undefined` if it does not.
 *
 * Why It's Necessary:
 * For a multi-provider system, we must be resilient. If one provider's API key
 * (e.g., `ANTHROPIC_API_KEY`) is missing, the entire application should NOT crash.
 * Instead, the system should gracefully disable only that specific provider and
 * continue operating with the others. This utility allows each provider adapter
 * to check for its own key without halting the whole service.
 *
 * Main Parts:
 * - `function getEnv`: The single exported function.
 */

/**
 * Retrieves an environment variable.
 * @param name The name of the environment variable.
 * @returns The value of the environment variable, or undefined if it is not set.
 *
 * @example
 * const apiKey = getEnv('GEMINI_API_KEY');
 * if (!apiKey) {
 *   // In the adapter's constructor:
 *   // logger.warn('GEMINI_API_KEY not found. Disabling Gemini provider.');
 *   // this.isEnabled = false;
 * }
 */
export function getEnv(name: string): string | undefined {
  return process.env[name];
}