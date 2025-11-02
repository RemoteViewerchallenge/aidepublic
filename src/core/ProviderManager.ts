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
import { HealthStatus, Model, ProviderId } from '../types/provider';
import { createModuleLogger } from '../utils/logger';

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
      'ProviderManager initialized with enabled adapters.' as string
    );
  }

  /**
   * Initializes the manager by loading state and starting background tasks.
   */
  public async initialize(): Promise<void> {
    // Load initial state for each provider from StateRepository.
    for (const adapter of this.adapters) {
      const storedState =
        await this.stateRepository.readJson<StoredProviderState>(
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

    // Perform an initial model fetch to warm up the cache before the server starts accepting requests.
    await this.getAvailableModels(true); // Pass true to force a fetch

    // Start a timer to periodically run health checks.
    // Health check interval set to 1 minute (60000ms) as requested, to reduce load.
    // Health check interval set to 1 minute (60000ms) as requested, to reduce load.
    this.healthCheckInterval = setInterval(() => this.runHealthChecks(), 60000);

    logger.info(
      { method: 'initialize' },
      'ProviderManager background tasks started.' as string
    );
  }

  private async runHealthChecks(): Promise<void> {
    for (const adapter of this.adapters) {
      const isHealthy = await adapter.checkHealth();
      const oldState = this.providerStates.get(adapter.id);
      const status: HealthStatus = isHealthy ? 'HEALTHY' : 'UNHEALTHY';

      // If the health status has changed for the worse, invalidate the cache.
      if (
        oldState &&
        oldState.healthStatus === 'HEALTHY' &&
        status !== 'HEALTHY'
      ) {
        logger.warn(
          { method: 'runHealthChecks', provider: adapter.id },
          'Provider has become unhealthy. Invalidating model cache.' as string
        );
        this.modelCache = [];
        this.lastCacheUpdate = 0;
      }

      const newState: StoredProviderState = {
        id: adapter.id,
        healthStatus: status,
        lastHealthCheck: Date.now(),
      };
      this.providerStates.set(adapter.id, newState);
      await this.stateRepository.writeJson(
        `provider-state/${adapter.id}.json`,
        newState
      );
      logger.debug(
        { method: 'runHealthChecks', provider: adapter.id, status },
        'Health check completed.' as string
      );
    }
  }

  /**
   * Returns a list of all models from healthy providers.
   */
  public async getAvailableModels(
    forceFetch: boolean = false
  ): Promise<Model[]> {
    const CACHE_TTL = 300000; // 5 minutes
    // Use the cache unless a force fetch is requested.
    if (
      !forceFetch &&
      Date.now() - this.lastCacheUpdate < CACHE_TTL &&
      this.modelCache.length > 0
    ) {
      logger.info(
        { method: 'getAvailableModels' },
        'Returning cached models.' as string
      );
      return this.modelCache;
    }

    logger.info(
      { method: 'getAvailableModels' },
      'Cache stale or empty. Fetching fresh models.' as string
    );
    const allModels: Model[] = [];
    const healthyAdapters = this.adapters.filter(adapter => {
      const state = this.providerStates.get(adapter.id);
      return state && state.healthStatus === 'HEALTHY';
    });

    for (const adapter of healthyAdapters) {
      try {
        const models = await adapter.fetchAvailableModels();
        allModels.push(...models);
      } catch (error) {
        logger.error(
          { method: 'getAvailableModels', provider: adapter.id, error },
          'Failed to fetch models from a healthy provider. Skipping this provider for now.' as string
        );
      }
    }
    this.modelCache = allModels;
    this.lastCacheUpdate = Date.now();
    return allModels;
  }

  /**
   * Retrieves a configured adapter by its unique ID.
   */
  public getAdapter(providerId: ProviderId): ProviderAdapter | undefined {
    return this.adapters.find(a => a.id === providerId);
  }

  /**
   * Clears any running background tasks, like health check timers.
   */
  public stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info(
        { method: 'stop' },
        'ProviderManager background tasks stopped.' as string
      );
    }
  }
}
