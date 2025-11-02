import { GoogleGenerativeAI } from '@google/generative-ai';
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

    // Fetch AI Studio models directly from Google's API
    console.log(
      '🔍 Fetching AI Studio models from Google Generative AI API...'
    );

    const apiKey = getEnv('AI_STUDIO_API_KEY');
    if (!apiKey) {
      console.log(
        '⚠️  AI_STUDIO_API_KEY not found - skipping AI Studio models'
      );
    } else {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const models = await (genAI as any).models.list();

        console.log(`📥 Found ${models.models?.length || 0} AI Studio models`);

        if (models.models) {
          for (const model of models.models) {
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
        }
      } catch (error) {
        console.error('❌ Failed to fetch AI Studio models:', error);
      }
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
