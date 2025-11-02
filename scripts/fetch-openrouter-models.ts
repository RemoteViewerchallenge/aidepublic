/**
 * @file Standalone script to fetch available models from OpenRouter.
 *
 * This utility script allows us to get an up-to-date list of models from
 * the OpenRouter API and save it to a local JSON file for inspection or
 * for other tools to consume.
 */

// Load environment variables from .env file
import 'dotenv/config';

import fs from 'fs/promises';
import path from 'path';
import { OpenRouterAdapter } from '../src/adapters/OpenRouterAdapter.js';
import { createModuleLogger } from '../src/utils/logger.js';

const logger = createModuleLogger('FetchOpenRouterModels');

async function main() {
  logger.info('Starting to fetch models from OpenRouter...');

  const adapter = new OpenRouterAdapter();

  if (!adapter.isEnabled) {
    logger.error(
      { reason: 'ADAPTER_DISABLED' },
      'OpenRouter adapter is not enabled. Make sure OPENROUTER_API_KEY is set in your .env file.'
    );
    process.exit(1);
  }

  const models = await adapter.fetchAvailableModels();

  if (models.length === 0) {
    logger.warn('No models were returned from the OpenRouter API.');
    return;
  }

  const outputPath = path.resolve(process.cwd(), 'data', 'openrouter-models.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(models, null, 2));

  logger.info({ count: models.length, path: outputPath }, 'Successfully fetched and saved models.');
}

main().catch(error => {
  logger.error({ error }, 'An unexpected error occurred while fetching models.');
  process.exit(1);
});