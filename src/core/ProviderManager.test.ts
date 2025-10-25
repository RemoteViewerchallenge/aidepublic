import { ProviderManager } from './ProviderManager';
import { ProviderAdapter } from '../adapters/BaseProviderAdapter';
import { StoredProviderState, StateRepository } from '../state/StateRepository';

// Create mock versions of our dependencies.
// We use jest.fn() to create mock functions that we can control.
const mockStateRepository: jest.Mocked<any> = {
  readJson: jest.fn(),
  writeJson: jest.fn(),
} as unknown as jest.Mocked<StateRepository>;

const mockHealthyAdapter: ProviderAdapter = {
  id: 'mock-healthy',
  isEnabled: true,
  checkHealth: jest.fn().mockResolvedValue(true),
  fetchAvailableModels: jest.fn(),
  executeChatCompletion: jest.fn().mockResolvedValue({} as any),
};

const mockDisabledAdapter: ProviderAdapter = {
  id: 'mock-disabled',
  isEnabled: false,
  checkHealth: jest.fn(),
  fetchAvailableModels: jest.fn(),
  executeChatCompletion: jest.fn(),
};

const mockUnhealthyAdapter: ProviderAdapter = {
  id: 'mock-unhealthy',
  isEnabled: true,
  checkHealth: jest.fn().mockResolvedValue(false),
  fetchAvailableModels: jest.fn(),
  executeChatCompletion: jest.fn(),
};

describe('ProviderManager', () => {
  beforeEach(() => {
    // Reset mocks before each test to ensure a clean state
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should filter out disabled adapters upon construction', () => {
      const adapters = [mockHealthyAdapter, mockDisabledAdapter];
      const providerManager = new ProviderManager(adapters, mockStateRepository);

      // We expect the internal list of adapters to only contain the healthy one.
      // This tests the filtering logic in the constructor.
      expect((providerManager as any).adapters).toHaveLength(1);
      expect((providerManager as any).adapters[0].id).toBe('mock-healthy');
    });

    it('should log the list of enabled adapters', () => {
      const adapters = [mockHealthyAdapter, mockDisabledAdapter];
      // We can spy on the logger to ensure it's being called correctly.
      // This test is a placeholder for more advanced logging tests.
      new ProviderManager(adapters, mockStateRepository);
    });
  });

  describe('initialize', () => {
    beforeAll(() => {
      // Use fake timers to control setInterval
      jest.useFakeTimers();
    });

    afterAll(() => {
      // Restore real timers
      jest.useRealTimers();
    });

    it('should load state, run initial health checks, and save the new state', async () => {
      // Arrange: Setup a pre-existing state for the healthy adapter
      const existingState: StoredProviderState = {
        id: 'mock-healthy',
        healthStatus: 'UNKNOWN',
        lastHealthCheck: 12345,
      };
      mockStateRepository.readJson.mockResolvedValue(existingState);

      const providerManager = new ProviderManager([mockHealthyAdapter], mockStateRepository);

      // Act: Initialize the manager
      await providerManager.initialize();
      providerManager.stop(); // Stop timers for test isolation

      // Assert:
      // 1. It tried to load the state for the adapter.
      expect(mockStateRepository.readJson).toHaveBeenCalledWith('provider-state/mock-healthy.json');

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
      (mockHealthyAdapter.fetchAvailableModels as jest.Mock).mockResolvedValue(healthyModels);
      (mockUnhealthyAdapter.fetchAvailableModels as jest.Mock).mockResolvedValue(unhealthyModels as any);

      const providerManager = new ProviderManager([mockHealthyAdapter, mockUnhealthyAdapter], mockStateRepository);
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
      (mockHealthyAdapter.fetchAvailableModels as jest.Mock).mockResolvedValue(healthyModels);

      const providerManager = new ProviderManager([mockHealthyAdapter], mockStateRepository);
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
