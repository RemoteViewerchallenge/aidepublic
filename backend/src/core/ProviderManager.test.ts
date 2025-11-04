/**
 * @file LEGACY: ProviderManager Tests
 *
 * ⚠️ DEPRECATED: As of November 2025, the system uses direct database access for model management.
 * ProviderManager is maintained for backward compatibility and real-time health checking scenarios.
 *
 * For current architecture, see:
 * - src/scripts/sync-models.ts (primary model sync)
 * - docs/Architecture-Update.md (architectural overview)
 * - docs/Database-Model-Management.md (database approach details)
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ProviderAdapter } from '../adapters/BaseProviderAdapter.js';
import {
  StateRepository,
  StoredProviderState,
} from '../state/StateRepository.js';
import { ProviderManager } from './ProviderManager.js';

// Create mock versions of our dependencies.
// We use jest.fn() to create mock functions that we can control.
const mockStateRepository = {
  readJson: vi.fn() as <T>(filePath: string) => Promise<T | null>,
  writeJson: vi.fn(),
};

const mockHealthyAdapter: ProviderAdapter = {
  id: 'mock-healthy',
  isEnabled: true,
  checkHealth: vi.fn().mockResolvedValue(true),
  fetchAvailableModels: vi.fn(),
  executeChatCompletion: vi.fn().mockResolvedValue({} as any),
};

const mockDisabledAdapter: ProviderAdapter = {
  id: 'mock-disabled',
  isEnabled: false,
  checkHealth: vi.fn(),
  fetchAvailableModels: vi.fn(),
  executeChatCompletion: vi.fn(),
};

const mockUnhealthyAdapter: ProviderAdapter = {
  id: 'mock-unhealthy',
  isEnabled: true,
  checkHealth: vi.fn().mockResolvedValue(false),
  fetchAvailableModels: vi.fn(),
  executeChatCompletion: vi.fn(),
};

describe.skip('ProviderManager (Legacy)', () => {
  beforeEach(() => {
    // Reset mocks before each test to ensure a clean state
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should filter out disabled adapters upon construction', () => {
      const adapters = [mockHealthyAdapter, mockDisabledAdapter];
      const providerManager = new ProviderManager(
        adapters,
        mockStateRepository as unknown as StateRepository
      );

      // We expect the internal list of adapters to only contain the healthy one.
      // This tests the filtering logic in the constructor.
      expect((providerManager as any).adapters).toHaveLength(1);
      expect((providerManager as any).adapters[0].id).toBe('mock-healthy');
    });

    it('should log the list of enabled adapters', () => {
      const adapters = [mockHealthyAdapter, mockDisabledAdapter];
      // We can spy on the logger to ensure it's being called correctly.
      // This test is a placeholder for more advanced logging tests.
      new ProviderManager(
        adapters,
        mockStateRepository as unknown as StateRepository
      );
    });
  });

  describe('initialize', () => {
    beforeAll(() => {
      // Use fake timers to control setInterval
      vi.useFakeTimers();
    });

    afterAll(() => {
      // Restore real timers
      vi.useRealTimers();
    });

    it('should load state, run initial health checks, and save the new state', async () => {
      // Arrange: Setup a pre-existing state for the healthy adapter
      const existingState: StoredProviderState = {
        id: 'mock-healthy',
        healthStatus: 'UNKNOWN',
        lastHealthCheck: 12345,
      };
      (mockStateRepository.readJson as any).mockResolvedValue(existingState);

      const providerManager = new ProviderManager(
        [mockHealthyAdapter],
        mockStateRepository as unknown as StateRepository
      );

      // Act: Initialize the manager
      await providerManager.initialize();
      providerManager.stop(); // Stop timers for test isolation

      // Assert:
      // 1. It tried to load the state for the adapter.
      expect(mockStateRepository.readJson).toHaveBeenCalledWith(
        'provider-state/mock-healthy.json'
      );

      // 2. It ran the health check for the adapter.
      expect(mockHealthyAdapter.checkHealth).toHaveBeenCalledTimes(1);

      // 3. It saved the new, healthy state to the repository.
      expect(mockStateRepository.writeJson).toHaveBeenCalledWith(
        'provider-state/mock-healthy.json',
        expect.objectContaining({ id: 'mock-healthy', healthStatus: 'HEALTHY' })
      );
    });
  });

  describe('getAvailableModels', () => {
    it('should return models only from healthy providers', async () => {
      // Arrange
      const healthyModels = [{ id: 'model-1', provider: 'mock-healthy' }];
      const unhealthyModels = [{ id: 'model-2', provider: 'mock-unhealthy' }];
      (mockHealthyAdapter.fetchAvailableModels as any).mockResolvedValue(
        healthyModels
      );
      (mockUnhealthyAdapter.fetchAvailableModels as any).mockResolvedValue(
        unhealthyModels
      );

      const providerManager = new ProviderManager(
        [mockHealthyAdapter, mockUnhealthyAdapter],
        mockStateRepository as unknown as StateRepository
      );
      await providerManager.initialize();
      providerManager.stop();

      // Act
      const availableModels = await providerManager.getAvailableModels();

      // Assert
      expect(availableModels).toHaveLength(1);
      expect(availableModels[0].id).toBe('model-1');
      expect(mockHealthyAdapter.fetchAvailableModels).toHaveBeenCalledTimes(1);
      expect(mockUnhealthyAdapter.fetchAvailableModels).not.toHaveBeenCalled();
    });

    it('should return cached models on subsequent calls', async () => {
      // Arrange
      const healthyModels = [{ id: 'model-1', provider: 'mock-healthy' }];
      (mockHealthyAdapter.fetchAvailableModels as any).mockResolvedValue(
        healthyModels
      );

      const providerManager = new ProviderManager(
        [mockHealthyAdapter],
        mockStateRepository as unknown as StateRepository
      );
      await providerManager.initialize();
      providerManager.stop();

      // Act
      await providerManager.getAvailableModels(); // First call, populates cache
      await providerManager.getAvailableModels(); // Second call, should use cache

      // Assert: fetchAvailableModels should only have been called once.
      expect(mockHealthyAdapter.fetchAvailableModels).toHaveBeenCalledTimes(1);
    });
  });
});
