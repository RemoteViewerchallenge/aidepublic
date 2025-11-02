import 'dotenv/config';
import pool from '../db/index.js';
import { getEnv } from '../utils/env.js';

async function syncModels() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Clear the existing models table
    await client.query('TRUNCATE TABLE models');

    // Fetch AI Studio models directly from Google's REST API
    console.log('🔍 Fetching AI Studio models from Google AI API...');

    const apiKey = getEnv('AI_STUDIO_API_KEY');
    if (!apiKey) {
      console.log(
        '⚠️  AI_STUDIO_API_KEY not found - skipping AI Studio models'
      );
    } else {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const models = data.models || [];

        console.log(`📥 Found ${models.length} AI Studio models`);

        for (const model of models) {
          const isEmbedding =
            model.supportedGenerationMethods?.includes('embedContent');
          const hasTools =
            model.supportedGenerationMethods?.includes('generateContent');

          await client.query(
            `INSERT INTO models (id, provider, name, description, context_length, parameters, tool_calling, vision, reasoning, embedding, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              model.name,
              'aistudio',
              model.displayName || model.name?.replace('models/', ''),
              model.description || '',
              model.inputTokenLimit || 0,
              null,
              hasTools || false,
              false, // Vision to be determined from model name/capabilities
              false, // Reasoning to be determined
              isEmbedding || false,
              JSON.stringify(model),
            ]
          );
        }
      } catch (error) {
        console.error('❌ Failed to fetch AI Studio models:', error);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Successfully synchronized AI Studio models!');
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
