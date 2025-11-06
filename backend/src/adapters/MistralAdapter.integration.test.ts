
import 'dotenv/config';
import { describe, it, expect, beforeEach } from 'vitest';
import { MistralAdapter } from './MistralAdapter';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.MISTRAL_API_KEY)('MistralAdapter Integration', () => {
  let adapter: MistralAdapter;

  beforeEach(() => {
    adapter = new MistralAdapter();
  });

  it('should be enabled', () => {
    expect(adapter.isEnabled).toBe(true);
  });

  it('should perform a health check', async () => {
    const isHealthy = await adapter.checkHealth();
    expect(isHealthy).toBe(true);
  }, 15000);

  it('should fetch available models', async () => {
    const models = await adapter.fetchAvailableModels();
    expect(models).toBeInstanceOf(Array);
    expect(models.length).toBeGreaterThan(0);
    const model = models[0];
    expect(model).toHaveProperty('id');
    expect(model).toHaveProperty('name');
  }, 15000);

  it('should execute a chat completion', async () => {
    const response = await adapter.executeChatCompletion({
      model: 'mistral-tiny', // A known Mistral model
      messages: [{ role: 'user', content: 'What is the best thing about France?' }],
      temperature: 0.7,
      maxTokens: 100,
    });

    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('model');
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0].message).toHaveProperty('content');
  }, 20000);
});
