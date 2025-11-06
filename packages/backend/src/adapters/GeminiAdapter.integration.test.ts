import { describe, it, expect, beforeAll } from 'vitest';

import type { Model } from '../types/provider.js';
import { getEnv } from '../utils/env.js';

import { GeminiAdapter } from './GeminiAdapter.js';

describe.skip('GeminiAdapter (Integration)', () => {
  let adapter: GeminiAdapter;

  beforeAll(() => {
    // This test makes real API calls and requires an API key.
    // If the key is not provided, we fail the test suite with a clear message.
    const apiKey = getEnv('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set. Integration tests cannot run.');
    }
    adapter = new GeminiAdapter();
  });

  it('should be enabled if the API key is provided', () => {
    expect(adapter.isEnabled).toBe(true);
  });

  it('checkHealth() should return true for a valid API key', async () => {
    const isHealthy = await adapter.checkHealth();
    expect(isHealthy).toBe(true);
  });

  it('fetchAvailableModels() should return a list of models', async () => {
    const models = await adapter.fetchAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    const geminiPro = models.find((m: Model) => m.id.includes('gemini-pro'));
    expect(geminiPro).toBeDefined();
    expect(geminiPro?.apiProvider).toBe('google');
    expect(geminiPro?.sourceProvider).toBe('google');
  });

  it('executeChatCompletion() should return a valid response', async () => {
    const response = await adapter.executeChatCompletion({
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Hello!' }],
    });
    expect(response.choices[0].message.content).toBeTruthy();
    expect(response.usage.totalTokens).toBeGreaterThan(0);
  });
});
