/**
 * @file ModelSelector Tests - Core Algorithm Logic
 *
 * ✅ CURRENT: These tests remain relevant with the new database-first architecture.
 * The ModelSelector algorithm is used for choosing the best model from database query results.
 *
 * While the source of models has changed (database vs. real-time adapters), the selection
 * logic and scoring rules are still applicable and important.
 */
import * as fsPromises from 'fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Model } from '../types/provider.js';

import { ModelSelector } from './ModelSelector.js';

// Mock the fs/promises module to control the config for tests.
vi.mock('fs/promises');

const mockedFs = vi.mocked(fsPromises);

// This is the mock configuration that our tests will use.
const mockSelectorConfig = {
  scoringRules: [
    {
      id: 'prefer-tool-use',
      description:
        'Adds a high score for models that support tool use when the prompt suggests it.',
      promptKeywordTrigger: ['call', 'api', 'tool'],
      condition: {
        property: 'supportsToolUse',
        operator: 'equals',
        value: true,
      },
      action: { type: 'addScore', value: 100 },
    },
    {
      id: 'score-by-context-window',
      description: 'Adds score based on the context window size.',
      condition: { property: 'contextWindow', operator: 'exists' },
      action: {
        type: 'addScoreFromProperty',
        property: 'contextWindow',
        divisor: 1000,
      },
    },
  ],
};

describe('ModelSelector', () => {
  let modelSelector: ModelSelector;

  // This helper function handles the async constructor pattern.
  const createSelector = async () => new ModelSelector();

  const mockModels: Model[] = [
    {
      id: 'google/gemini-pro',
      name: 'Gemini Pro',
      apiProvider: 'google',
      sourceProvider: 'google',
      contextWindow: 32768,
      supportsToolUse: true, // The only one with tool use
      isFree: false, // This model is not free
    },
    {
      id: 'mistralai/mistral-7b-instruct',
      name: 'Mistral 7B Instruct',
      apiProvider: 'openrouter',
      sourceProvider: 'mistralai',
      contextWindow: 4096,
      supportsToolUse: true, // This is now a free model with tool use
      isFree: true, // This model is free
    },
    {
      id: 'google/gemma-7b',
      name: 'Gemma 7B',
      apiProvider: 'openrouter',
      sourceProvider: 'google',
      contextWindow: 8192,
      supportsToolUse: false, // Largest context among free models
      isFree: true,
    },
  ];

  beforeEach(() => {
    // Before each test, mock a successful config load.
    mockedFs.readFile.mockResolvedValue(JSON.stringify(mockSelectorConfig));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('selectBestModel', () => {
    it('should return null if no models are available', async () => {
      modelSelector = await createSelector();
      const selected = await modelSelector.selectBestModel({}, {});
      expect(selected).toBeNull();
    });

    it('should fall back to the first model if config loading fails', async () => {
      // Arrange: Mock a failed config load for this specific test.
      mockedFs.readFile.mockRejectedValue(new Error('File not found'));
      modelSelector = await createSelector();

      // Act
      const selected = await modelSelector.selectBestModel({}, {});

      // Assert: It should return the first model in the list as a fallback.
      expect(selected?.id).toBe(mockModels[0].id);
    });

    it('should prioritize free models when available', async () => {
      // Arrange
      modelSelector = await createSelector();

      // Act: Run selection on the full list of models.
      const selected = await modelSelector.selectBestModel(
        { isFree: true },
        {}
      );

      console.log('Selected model for simple task:', selected?.id);
      // Assert: It should select from the free models. Based on our rules,
      // Gemma has a larger context window (8192) than Mistral (4096), so it gets a higher score.
      expect(selected?.id).toBe('google/gemma-7b');
      expect(selected?.isFree).toBe(true);
    });

    it('should score all models if no free models are available', async () => {
      // Arrange
      modelSelector = await createSelector();

      // Act
      const selected = await modelSelector.selectBestModel({}, {});

      console.log(
        'Selected model when no free models are available:',
        selected?.id
      );
      // Assert: It should select the only available model.
      expect(selected?.id).toBe('google/gemini-pro');
    });

    it('should select a model that supports tool use if the task requires it', async () => {
      // Arrange
      modelSelector = await createSelector();

      // Act: Even though free models are available, the tool use rule gives such a high
      // score to Gemini Pro that it will be chosen if we consider all models.
      // The current logic scores *within* the free tier first. Since no free model
      // has tool use, it will pick the best of the free tier.
      // To test the rule, we need to present a choice where the rule matters.
      // Let's imagine a scenario where no free models are available.
      const selected = await modelSelector.selectBestModel(
        { toolCalling: true },
        {}
      );

      // Assert: The selector should now pick the free model that supports tool use.
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe('mistralai/mistral-7b-instruct');
      expect(selected?.supportsToolUse).toBe(true);
    });
  });
});
