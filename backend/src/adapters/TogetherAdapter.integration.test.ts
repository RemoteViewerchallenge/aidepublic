
import 'dotenv/config';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TogetherAdapter } from './TogetherAdapter';

// Skip the entire suite if the API key is not available
const describeIf = (condition: boolean) => condition ? describe : describe.skip;

describeIf(!!process.env.TOGETHER_API_KEY)('TogetherAdapter Integration', () => {
  let adapter: TogetherAdapter;

  beforeEach(() => {
    adapter = new TogetherAdapter();
  });

  it('should be enabled', () => {
    expect(adapter.isEnabled).toBe(true);
  });

  it('should perform a health check', async () => {
    const isHealthy = await adapter.checkHealth();
    expect(isHealthy).toBe(true);
  }, 15000); // 15-second timeout

  it('should fetch available models', async () => {
    const models = await adapter.fetchAvailableModels();
    expect(models).toBeInstanceOf(Array);
    expect(models.length).toBeGreaterThan(0);

    const model = models[0];
    expect(model).toHaveProperty('id');
    expect(model).toHaveProperty('name');
    expect(model).toHaveProperty('contextWindow');
  }, 15000); // 15-second timeout for the API call

  it('should execute a chat completion', async () => {
    const response = await adapter.executeChatCompletion({
      model: 'meta-llama/Llama-2-7b-chat-hf',
      messages: [{ role: 'user', content: 'Hello!' }],
      temperature: 0.7,
      maxTokens: 50,
    });

    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('model');
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0].message).toHaveProperty('content');
  }, 20000); // 20-second timeout
});
