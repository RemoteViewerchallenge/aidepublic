import 'dotenv/config';
import pool from '../db/index.js';

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

    // Skip OpenRouter models - only use AI Studio models
    console.log('🚫 Skipping OpenRouter models - using AI Studio only');

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
