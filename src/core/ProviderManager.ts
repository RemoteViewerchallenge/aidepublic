

/**
 * @file This is the main engine and central orchestrator of our system.
 *
 * Why It's Necessary:
 * It's the heart of the system, connecting all the other components. It runs the
 * health checks, enforces quotas, and ensures the whole system works in concert.
 * Without it, the other modules are just isolated, non-functional pieces.
 *
 * Main Parts:
 * - `class ProviderManager`: The main class for the engine.
 *
 * Key Methods:
 * - `async initialize()`: Initializes all configured provider adapters and starts health checks.
 * - `getAvailableModels()`: Returns a list of all models from healthy providers.
 * - `stop()`: Clears any running background tasks, like health check timers.
 */

import { ProviderAdapter } from '../adapters/BaseProviderAdapter';
import { StateRepository, StoredProviderState } from '../state/StateRepository';
import { createModuleLogger } from '../utils/logger';
import { Model, ProviderId, HealthStatus } from '../types/provider';

const logger = createModuleLogger('ProviderManager');

interface ProviderState {
  id: ProviderId;
  healthStatus: HealthStatus;
  lastHealthCheck: number;
}

export class ProviderManager {
  private adapters: ProviderAdapter[];
  private stateRepository: StateRepository;
  private providerStates: Map<ProviderId, ProviderState> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private modelCache: Model[] = [];
  private lastCacheUpdate = 0;

  constructor(adapters: ProviderAdapter[], stateRepository: StateRepository) {
    this.adapters = adapters.filter(a => a.isEnabled);
    this.stateRepository = stateRepository;

    logger.info(
      { method: 'constructor', enabledAdapters: this.adapters.map(a => a.id) },
      'ProviderManager initialized with enabled adapters.'
    );
  }

  /**
   * Initializes the manager by loading state and starting background tasks.
   */
  public async initialize(): Promise<void> {
    // Load initial state for each provider from StateRepository.
    for (const adapter of this.adapters) {
      const storedState = await this.stateRepository.readJson<StoredProviderState>(
        `provider-state/${adapter.id}.json`
      );
      this.providerStates.set(adapter.id, {
        id: adapter.id,
        healthStatus: storedState?.healthStatus || 'UNKNOWN',
        lastHealthCheck: storedState?.lastHealthCheck || 0,
      });
    }

    // Run an immediate health check after loading initial state.
    await this.runHealthChecks();

    // Start a timer to periodically run health checks.
    this.healthCheckInterval = setInterval(() => this.runHealthChecks(), 60000); // Run every 60 seconds

    logger.info({ method: 'initialize' }, 'ProviderManager background tasks started.');
  }

  private async runHealthChecks(): Promise<void> {
    for (const adapter of this.adapters) {
      const isHealthy = await adapter.checkHealth();
      const status: HealthStatus = isHealthy ? 'HEALTHY' : 'UNHEALTHY';
      const newState: StoredProviderState = {
        id: adapter.id,
        healthStatus: status,
        lastHealthCheck: Date.now(),
      };
      this.providerStates.set(adapter.id, newState);
      await this.stateRepository.writeJson(`provider-state/${adapter.id}.json`, newState);
      logger.debug({ method: 'runHealthChecks', provider: adapter.id, status }, 'Health check completed.');
    }
  }

  /**
   * Returns a list of all models from healthy providers.
   */
  public async getAvailableModels(): Promise<Model[]> {
    if (Date.now() - this.lastCacheUpdate < 300000 && this.modelCache.length > 0) {
      logger.info({ method: 'getAvailableModels' }, 'Returning cached models.');
      return this.modelCache;
    }

    let allModels: Model[] = [];
    for (const adapter of this.adapters) {
      const providerState = this.providerStates.get(adapter.id);
      if (providerState && providerState.healthStatus === 'HEALTHY') {
        try {
          const models = await adapter.fetchAvailableModels();
          allModels = allModels.concat(models);
        } catch (error) {
          logger.error(
            { method: 'getAvailableModels', provider: adapter.id, error },
            'Failed to fetch models from healthy provider.'
          );
        }
      }
    }
    this.modelCache = allModels;
    this.lastCacheUpdate = Date.now();
    return allModels;
  }

  /**
   * Clears any running background tasks, like health check timers.
   */
  public stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info({ method: 'stop' }, 'ProviderManager background tasks stopped.');
    }
  }
}
