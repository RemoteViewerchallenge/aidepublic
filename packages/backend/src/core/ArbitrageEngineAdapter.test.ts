/**
 * @file LEGACY: ArbitrageEngineAdapter Tests
 *
 * ⚠️ DEPRECATED: As of November 2025, the system uses direct database access for model management.
 * This adapter is maintained for backward compatibility and Volcano.dev integration only.
 *
 * For current architecture, see:
 * - src/scripts/sync-models.ts (primary model sync)
 * - docs/Architecture-Update.md (architectural overview)
 *
 * This test suite verifies the legacy adapter's orchestration logic in complete
 * isolation, ensuring it correctly calls each part of our engine in the right order.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProviderAdapter } from '../adapters/BaseProviderAdapter.js';
import type { Model } from '../types/provider.js';

import { ArbitrageEngineAdapter } from './ArbitrageEngineAdapter.js';
import type { ModelSelector } from './ModelSelector.js';
import type { ProviderManager } from './ProviderManager.js';

// Mock dependencies
const mockProviderManager: Partial<ProviderManager> = {
  getAvailableModels: vi.fn(),
  getAdapter: vi.fn(),
};

const mockModelSelector: Partial<ModelSelector> = {
  selectBestModel: vi.fn(),
};

const mockAdapter: Partial<ProviderAdapter> = {
  id: 'mock-provider',
  isEnabled: true,
  checkHealth: vi.fn(),
  fetchAvailableModels: vi.fn(),
  executeChatCompletion: vi.fn(),
};

describe.skip('ArbitrageEngineAdapter (Legacy)', () => {
  let adapter: ArbitrageEngineAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ArbitrageEngineAdapter(
      mockProviderManager as ProviderManager,
      mockModelSelector as ModelSelector
    );
  });

  it('should correctly orchestrate model selection and execution', async () => {
    // Arrange: Set up the mock return values for each component of our engine.
    const mockAvailableModels: Model[] = [
      {
        id: 'test-model',
        name: 'Test Model',
        apiProvider: 'mock-provider',
        sourceProvider: 'mock-provider',
      } as Model,
    ];
    const mockSelectedModel = mockAvailableModels[0];
    const mockResponse = {
      choices: [{ message: { content: 'Hello from mock!' } }],
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };

    // When the adapter asks for models, the mock ProviderManager will return this list.
    (mockProviderManager.getAvailableModels as any).mockResolvedValue(
      mockAvailableModels
    );
    // When the adapter asks for the best model, the mock ModelSelector will return this one.
    (mockModelSelector.selectBestModel as any).mockReturnValue(
      mockSelectedModel
    );
    // When the adapter needs the provider adapter, the mock ProviderManager will return our mock.
    (mockProviderManager.getAdapter as any).mockReturnValue(mockAdapter);
    // When the adapter executes the call, the mock provider adapter will return this response.
    (mockAdapter.executeChatCompletion as any).mockResolvedValue(mockResponse);

    // Act: Call the execute method on our adapter, which should trigger the full orchestration.
    const result = await adapter.gen({ prompt: 'A test prompt' });

    // Assert: Verify that each part of the orchestration was called correctly.
    expect(mockProviderManager.getAvailableModels).toHaveBeenCalledTimes(1);
    expect(mockModelSelector.selectBestModel).toHaveBeenCalledWith(
      mockAvailableModels,
      'A test prompt' as any
    );
    expect(mockProviderManager.getAdapter).toHaveBeenCalledWith(
      'mock-provider' as any
    );
    expect(mockAdapter.executeChatCompletion).toHaveBeenCalledWith({
      model: 'test-model',
      messages: [{ role: 'user', content: 'A test prompt' }],
    });
    // Finally, assert that the final output is the string content from the response.
    expect(result).toBe('Hello from mock!');
  });
});
