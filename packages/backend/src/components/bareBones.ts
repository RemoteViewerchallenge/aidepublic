/**
 * @file bareBones.ts
 * @description Bare-bones API endpoints for direct provider interaction, bypassing the database.
 * This is used for the pure-monaco page for direct testing.
 */

import { z } from 'zod';

import { AIStudioAdapter } from '../adapters/AIStudioAdapter.js';
import { GeminiAdapter } from '../adapters/GeminiAdapter.js';
import { OpenRouterAdapter } from '../adapters/OpenRouterAdapter.js';
import { publicProcedure, router } from '../trpc/trpc.js';
import type { Model } from '../types/provider.js';

/**
 * Fetches models directly from provider APIs, bypassing the database.
 */
const getModelsFromProviders = publicProcedure.query(async () => {
  console.log('Fetching models directly from provider APIs...');
  const openRouterAdapter = new OpenRouterAdapter();
  const geminiAdapter = new GeminiAdapter();
  const aiStudioAdapter = new AIStudioAdapter();

  const allModels: Model[] = [];
  const providers = [];

  if (openRouterAdapter.isEnabled) {
    providers.push(openRouterAdapter.fetchAvailableModels());
  }
  if (geminiAdapter.isEnabled) {
    providers.push(geminiAdapter.fetchAvailableModels());
  }
  if (aiStudioAdapter.isEnabled) {
    providers.push(aiStudioAdapter.fetchAvailableModels());
  }

  const results = await Promise.allSettled(providers);

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      allModels.push(...result.value);
    } else if (result.status === 'rejected') {
      console.error('Failed to fetch models from a provider:', result.reason);
    }
  });

  console.log(`Fetched a total of ${allModels.length} models.`);
  return allModels;
});

/**
 * Generates content using a specific model from a specific provider.
 */
const generateBareBones = publicProcedure
  .input(
    z.object({
      prompt: z.string(),
      modelId: z.string(),
      providerId: z.enum(['openrouter', 'google', 'aistudio']),
    })
  )
  .mutation(
    async ({
      input,
    }: {
      input: {
        prompt: string;
        modelId: string;
        providerId: 'openrouter' | 'google' | 'aistudio';
      };
    }) => {
      const { prompt, modelId, providerId } = input;

      let adapter;
      if (providerId === 'openrouter') {
        adapter = new OpenRouterAdapter();
      } else if (providerId === 'google') {
        adapter = new GeminiAdapter();
      } else if (providerId === 'aistudio') {
        adapter = new AIStudioAdapter();
      } else {
        throw new Error(`Unsupported provider: ${providerId}`);
      }

      if (!adapter.isEnabled) {
        throw new Error(`Adapter for ${providerId} is not enabled.`);
      }

      const response = await adapter.executeChatCompletion({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
      });

      return {
        content: response.choices[0]?.message?.content || '',
        modelId: response.model,
        providerId: adapter.id,
      };
    }
  );

export const bareBonesRouter = router({
  getModelsFromProviders,
  generateBareBones,
});
