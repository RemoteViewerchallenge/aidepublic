import { ModelSelector } from './ModelSelector';
import { Model } from '../types/provider';

describe('ModelSelector', () => {
  let modelSelector: ModelSelector;

  beforeEach(() => {
    modelSelector = new ModelSelector();
  });

  const mockModels: Model[] = [
    {
      id: 'google/gemini-pro',
      name: 'Gemini Pro',
      apiProvider: 'google',
      sourceProvider: 'google',
      contextWindow: 8192,
      supportsToolUse: true,
    },
    {
      id: 'mistralai/mistral-7b-instruct',
      name: 'Mistral 7B Instruct',
      apiProvider: 'openrouter',
      sourceProvider: 'mistralai',
      contextWindow: 4096,
      supportsToolUse: false,
    },
    {
      id: 'google/gemma-7b',
      name: 'Gemma 7B',
      apiProvider: 'openrouter',
      sourceProvider: 'google',
      contextWindow: 8192,
      supportsToolUse: false,
    },
  ];

  describe('selectBestModel', () => {
    it('should return null if no models are available', () => {
      const selected = modelSelector.selectBestModel([], 'A simple task');
      expect(selected).toBeNull();
    });

    it('should return the first model if no specific logic is implemented yet', () => {
      const selected = modelSelector.selectBestModel(mockModels, 'A simple task');
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe('google/gemini-pro');
    });

    it('should prefer a model that supports tool use if the task requires it', () => {
      const taskRequiringTools = 'Please call the weather API for San Francisco.';
      const selected = modelSelector.selectBestModel(mockModels, taskRequiringTools);
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe('google/gemini-pro');
      expect(selected?.supportsToolUse).toBe(true);
    });

    it('should prefer a model with a larger context window for long documents', () => {
      const longDocumentTask = 'Summarize this very long document...';
      // Create a model list where the best model isn't the first one
      const reorderedModels = [
        mockModels[1], // Mistral (small context)
        mockModels[0], // Gemini (large context)
      ];
      const selected = modelSelector.selectBestModel(reorderedModels, longDocumentTask);
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe('google/gemini-pro');
    });
  });
});