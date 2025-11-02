import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncModels() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Clear the existing models table
    await client.query('TRUNCATE TABLE models');

    // Ingest and normalize AI Studio models
    const aiStudioResult = await client.query('SELECT * FROM ai_studio_models');
    for (const model of aiStudioResult.rows) {
      const isEmbedding =
        model.supportedGenerationMethods?.includes('embedContent');
      await client.query(
        `INSERT INTO models (id, provider, name, description, context_length, parameters, tool_calling, vision, reasoning, embedding, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          model.id,
          'aistudio',
          model.displayName || model.id.replace('models/', ''),
          model.description,
          model.inputTokenLimit,
          null, // Parameters not available in ai_studio_models
          model.supportedGenerationMethods?.includes('toolUse'),
          null, // Vision not directly available
          model.thinking || false,
          isEmbedding,
          JSON.stringify(model),
        ]
      );
    }

    // Ingest and normalize OpenRouter models - ONLY FREE MODELS
    const openRouterPath = path.resolve(
      __dirname,
      '../../data/openrouter-models-raw.json'
    );
    const openRouterData = await fs.readFile(openRouterPath, 'utf-8');
    const openRouterJson = JSON.parse(openRouterData);

    let freeModelCount = 0;
    let totalModelCount = 0;

    for (const model of openRouterJson.data) {
      totalModelCount++;

      // Check if model is completely FREE (all pricing fields = "0")
      const pricing = model.pricing || {};
      const isFree =
        pricing.image === '0' &&
        pricing.prompt === '0' &&
        pricing.request === '0' &&
        pricing.completion === '0' &&
        pricing.web_search === '0' &&
        pricing.internal_reasoning === '0';

      // SKIP paid models - only insert free ones
      if (!isFree) {
        continue;
      }

      freeModelCount++;

      const isVision =
        model.architecture.input_modalities?.includes('image') ||
        model.architecture.modality?.includes('image');
      const toolCalling = model.supported_parameters?.includes('tools');
      const isEmbedding = model.id.includes('embed');

      await client.query(
        `INSERT INTO models (id, provider, name, description, context_length, parameters, tool_calling, vision, reasoning, embedding, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
        [
          model.id,
          'openrouter',
          model.name,
          model.description,
          model.context_length,
          model.architecture.instruct_type ? 1 : null, // A simple way to check for parameters
          toolCalling,
          isVision,
          false, // Reasoning not directly available
          isEmbedding,
          JSON.stringify(model),
        ]
      );
    }

    console.log(
      `🆓 Synced ${freeModelCount} FREE models out of ${totalModelCount} total OpenRouter models`
    );
    console.log(`💰 Skipped ${totalModelCount - freeModelCount} paid models`);

    await client.query('COMMIT');
    console.log('Successfully synchronized models from all sources.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Failed to synchronize models:', error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

syncModels();
