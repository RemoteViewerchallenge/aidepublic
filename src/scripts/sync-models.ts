import 'dotenv/config';
import pool from '../db/index.js';
import { GeminiAdapter } from '../adapters/GeminiAdapter.js';

async function syncModels() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Clear the existing models table
    await client.query('TRUNCATE TABLE models');

    // Fetch AI Studio models directly from Gemini API
    console.log('🔍 Fetching AI Studio models from Gemini API...');
    const geminiAdapter = new GeminiAdapter();
    
    if (geminiAdapter.isEnabled) {
      const models = await geminiAdapter.fetchAvailableModels();
      console.log(`📥 Found ${models.length} AI Studio models`);
      
      for (const model of models) {
        await client.query(
          `INSERT INTO models (id, provider, name, description, context_length, parameters, tool_calling, vision, reasoning, embedding, raw_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            model.id,
            'aistudio',
            model.name,
            model.id, // Use id as description for now
            model.contextWindow || 0,
            null,
            model.supportsToolUse || false,
            false, // Vision support to be determined
            false, // Reasoning support to be determined
            false, // Not embedding models
            JSON.stringify(model),
          ]
        );
      }
    } else {
      console.log('⚠️  Gemini API not available - check GEMINI_API_KEY');
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
