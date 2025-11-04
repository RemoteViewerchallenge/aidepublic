/**
 * @file Provides utility functions for handling asynchronous operations like retries.
 *
 * Main Values Passed:
 * The `retryWithBackoff` function takes another `function to execute`. It will re-run
 * it multiple times with increasing delays if it fails, eventually returning the
 * result or throwing the final error.
 *
 * Why It's Necessary:
 * The internet is unreliable. This utility makes our application resilient to
 * temporary network failures or API hiccups for a *single* API call. It handles
 * transient, recoverable errors before the higher-level `ProviderManager` needs
 * to invoke its "Exhaustive Fallbacks" logic to switch to another model or provider.
 */