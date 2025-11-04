import { describe, it, expect, beforeAll } from 'vitest';
import { OpenRouterAdapter } from './OpenRouterAdapter.js';
import { getEnv } from '../utils/env.js';
import { Model } from '../types/provider.js';

// This test makes real API calls and will be skipped if the API key is not provided.
const API_KEY = getEnv('OPENROUTER_API_KEY');
const describeIf = API_KEY ? describe : describe.skip;

describeIf('OpenRouterAdapter (Integration)', () => {
  let adapter: OpenRouterAdapter;

  beforeAll(() => {
    adapter = new OpenRouterAdapter();
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
    expect(models.length, 'Expected to fetch models from OpenRouter, but received an empty list. Check API key and network.').toBeGreaterThan(0);
    const freeModel = models.find((m: Model) => m.id.includes('mistral'));
    expect(freeModel).toBeDefined();
    expect(freeModel?.apiProvider).toBe('openrouter');
    expect(freeModel?.sourceProvider).toBe('mistralai');
  });

  it('executeChatCompletion() should return a valid response from a free model', async () => {
    const response = await adapter.executeChatCompletion({
      // Use a known free model on OpenRouter for testing
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [{ role: 'user', content: 'Hello!' }],
    });
    expect(response.choices[0].message.content).toBeTruthy();
    expect(response.usage.totalTokens).toBeGreaterThan(0);
  });
});