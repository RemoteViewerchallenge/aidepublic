
import 'dotenv/config';
import pg from 'pg';
import { getEnv } from '../utils/env.js';
import { ProviderAdapter } from '../adapters/BaseProviderAdapter.js';
import { TogetherAdapter } from '../adapters/TogetherAdapter.js';
import { GroqAdapter } from '../adapters/GroqAdapter.js';
import { MistralAdapter } from '../adapters/MistralAdapter.js';
import { OpenRouterAdapter } from '../adapters/OpenRouterAdapter.js';
import { AIStudioAdapter } from '../adapters/AIStudioAdapter.js';

const { Pool } = pg;
const connectionString = getEnv('PG_CONNECTION');
const pool = new Pool({
  connectionString,
});

async function syncModels() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE models');

    const adapters: ProviderAdapter[] = [
      new TogetherAdapter(),
      new GroqAdapter(),
      new MistralAdapter(),
      new OpenRouterAdapter(),
      new AIStudioAdapter(),
    ];

    for (const adapter of adapters) {
      if (adapter.isEnabled) {
        console.log(`🔍 Fetching models from ${adapter.id}...`);
        try {
          const models = await adapter.fetchAvailableModels();
          console.log(`📥 Found ${models.length} models from ${adapter.id}`);
          for (const model of models) {
            await client.query(
              `INSERT INTO models (id, provider, name, description, context_length, parameters, tool_calling, vision, reasoning, embedding, raw_data)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                model.id,
                adapter.id,
                model.name,
                model.description || '',
                model.contextWindow || 0,
                null, // Parameters are not yet available
                model.supportsToolUse || false,
                false, // Vision is not yet available
                false, // Reasoning is not yet available
                false, // Embedding is not yet available
                JSON.stringify(model),
              ]
            );
          }
        } catch (error) {
          console.error(`❌ Failed to fetch models from ${adapter.id}:`, error);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Successfully synchronized models from all sources.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Failed to synchronize models:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end(); // Close the pool
  }
}

syncModels();
