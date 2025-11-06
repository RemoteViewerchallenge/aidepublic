
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

// Model-specific rate limits (Requests Per Minute) from Google's documentation.
// This data is not available from the API, so we maintain it here.
const AI_STUDIO_MODEL_RPMS: Record<string, number> = {
  'models/gemini-2.5-pro': 2,
  'models/gemini-2.5-flash': 10,
  'models/gemini-2.5-flash-preview': 10,
  'models/gemini-2.5-flash-lite': 15,
  'models/gemini-2.5-flash-lite-preview': 15,
  'models/gemini-2.0-flash': 15,
  'models/gemini-2.0-flash-lite': 30,
  'models/gemini-2.5-flash-live': 999, // '*' indicates a high limit, not strictly defined
  'models/gemini-2.5-flash-preview-native-audio': 999,
  'models/gemini-2.0-flash-live': 999,
  'models/gemini-2.5-flash-preview-tts': 3,
  'models/gemini-2.0-flash-preview-image-generation': 10,
  'models/gemma-3': 30,
  'models/gemma-3n': 30,
  'models/embedding-001': 100, // Assuming 'Gemini Embedding' refers to this
  'models/gemini-robotics-er-1.5-preview': 10,
  'models/gemini-1.5-flash-001': 15, // Deprecated
  'models/gemini-1.5-flash-8b': 15, // Deprecated
  // Add older models for completeness
  'models/gemini-1.0-pro': 60,
};

async function syncModels() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
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
            model.supportedGenerationMethods?.includes('embedContent') ||
            model.name?.toLowerCase().includes('embedding');
          const hasTools =
            model.supportedGenerationMethods?.includes('toolCalling');
          const hasVision = model.name?.toLowerCase().includes('vision');
          // Reasoning is harder to infer for Google models, but we can check the name.
          const hasReasoning = model.name?.toLowerCase().includes('reasoning');

          const rpm = AI_STUDIO_MODEL_RPMS[model.name] || 60; // Default to 60 RPM if not in our list

          try {
            await client.query('SAVEPOINT aistudio_insert');
            await client.query(
              `INSERT INTO models (id, provider, name, description, context_length, parameters, tool_calling, vision, reasoning, embedding, raw_data, rpm)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                model.name,
                'aistudio',
                model.displayName || model.name?.replace('models/', ''),
                model.description || '',
                model.inputTokenLimit || 0,
                null,
                hasTools || false,
                hasVision || false,
                hasReasoning || false,
                isEmbedding,
                JSON.stringify(model),
                rpm,
              ]
            );
          } catch (insertError) {
            await client.query('ROLLBACK TO SAVEPOINT aistudio_insert');
            console.error(`❌ Failed to insert AI Studio model: ${model.name}`);
            // Log only the relevant part of the error
            const pgError = insertError as any;
            console.error(
              `   Reason: ${pgError.message} (Code: ${pgError.code})`
            );
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch AI Studio models:', error);
      }
    }

    // Fetch OpenRouter models directly from their API
    console.log('🔍 Fetching OpenRouter models from API...');

    try {
      const openRouterApiKey = getEnv('OPENROUTER_API_KEY');
      if (!openRouterApiKey) {
        console.log(
          '⚠️  OPENROUTER_API_KEY not found - skipping OpenRouter models'
        );
      } else {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const openRouterData = await response.json();
        const freeModels = (openRouterData.data || []).filter((model: any) => {
          const isFreeInId = model.id.includes(':free');
          const isFreeInPricing =
            model.pricing &&
            (model.pricing.prompt === '0' ||
              parseFloat(model.pricing.prompt) === 0);
          return isFreeInId || isFreeInPricing;
        });

        console.log(`📥 Found ${freeModels.length} free OpenRouter models.`);
        for (const model of freeModels) {
          const hasVision =
            model.architecture?.input_modalities?.includes('image') ||
            model.architecture?.modality?.includes('image') ||
            model.name?.toLowerCase().includes('vision');
          const hasReasoning =
            model.supported_parameters?.includes('reasoning') ||
            model.supported_parameters?.includes('include_reasoning') ||
            model.name?.toLowerCase().includes('thinking') ||
            model.name?.toLowerCase().includes('reasoning');
          const hasTools =
            model.supported_parameters?.includes('tools') ||
            model.supported_parameters?.includes('tool_choice') ||
            model.architecture?.instruct_type === 'function_calling' ||
            model.architecture?.tool_use === true;
          const isEmbedding =
            model.architecture?.output_modalities?.includes('embeddings') ||
            model.name?.toLowerCase().includes('embedding');

          try {
            await client.query('SAVEPOINT openrouter_insert');
            await client.query(
              `INSERT INTO models (id, provider, name, description, context_length, parameters, tool_calling, vision, reasoning, embedding, raw_data, rpm)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                model.id,
                'openrouter',
                model.name,
                model.description || '',
                model.context_length || 0,
                null,
                hasTools || false,
                hasVision || false,
                hasReasoning || false,
                isEmbedding || false,
                JSON.stringify(model),
                null, // OpenRouter rate limits are not a billing concern for us
              ]
            );
          } catch (insertError) {
            await client.query('ROLLBACK TO SAVEPOINT openrouter_insert');
            console.error(`❌ Failed to insert OpenRouter model: ${model.id}`);
            // Log only the relevant part of the error
            const pgError = insertError as any;
            console.error(
              `   Reason: ${pgError.message} (Code: ${pgError.code})`
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch OpenRouter models:', error);
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
