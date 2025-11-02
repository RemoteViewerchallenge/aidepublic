import { beforeAll, describe, expect, it } from 'vitest';
import { Model } from '../types/provider.js';
import { getEnv } from '../utils/env.js';
import { AIStudioAdapter } from './AIStudioAdapter.js';

describe('AIStudioAdapter (Integration)', () => {
  let adapter: AIStudioAdapter;

  beforeAll(() => {
    // This test makes real API calls and requires an API key.
    // If the key is not provided, we fail the test suite with a clear message.
    const apiKey = getEnv('AISTUDIO_API_KEY');
    if (!apiKey) {
      throw new Error(
        'AISTUDIO_API_KEY is not set. Integration tests cannot run.'
      );
    }
    adapter = new AIStudioAdapter();
  });

  it('should be enabled if the API key is provided', () => {
    expect(adapter.isEnabled).toBe(true);
  });

  it('checkHealth() should return true for a valid API key', async () => {
    const isHealthy = await adapter.checkHealth();
    expect(isHealthy).toBe(true);
  });

  it.skip('fetchAvailableModels() should return a list of models', async () => {
    const models = await adapter.fetchAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    const geminiPro = models.find((m: Model) => m.id.includes('gemini-pro'));
    expect(geminiPro).toBeDefined();
    expect(geminiPro?.apiProvider).toBe('aistudio');
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

  it.skip('canHandleToolUse() should be skipped until implementation', async () => {
    // This test is skipped as tool use is not yet implemented for AI Studio.
    await expect(adapter.canHandleToolUse()).resolves.toBe(false);
  });
});
