import { GeminiAdapter } from '../adapters/GeminiAdapter';
import { OpenRouterAdapter } from '../adapters/OpenRouterAdapter';
import { StateRepository } from '../state/StateRepository';
import { ArbitrageEngineAdapter } from './ArbitrageEngineAdapter';
// Adjust the import to match the actual export from './ModelSelector'
import { ModelSelector } from './ModelSelector';
import { ProviderManager } from './ProviderManager';

describe('ArbitrageEngineAdapter Integration Test', () => {
  let arbitrageEngine: ArbitrageEngineAdapter;
  let providerManager: ProviderManager;

  beforeAll(async () => {
    // Setup the real components
    const stateRepository = new StateRepository('state');
    const adapters = [new OpenRouterAdapter(), new GeminiAdapter()];
    providerManager = new ProviderManager(adapters, stateRepository);
    await providerManager.initialize();

    const modelSelector = new ModelSelector();
    arbitrageEngine = new ArbitrageEngineAdapter(
      providerManager,
      modelSelector
    );
  });

  it('should select a free model and execute a request', async () => {
    // This prompt will be sent to the arbitrage engine
    const testPrompt =
      'Explain the importance of zero-cost AI models in three sentences.';

    // Execute the request through the adapter
    const result = await arbitrageEngine.gen(testPrompt);

    // Assertions
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(10);

    console.log('Arbitrage Engine Test Result:', result);
  }, 30000); // Increase timeout to 30s for network requests

  afterAll(() => {
    providerManager.stop();
  });
});
