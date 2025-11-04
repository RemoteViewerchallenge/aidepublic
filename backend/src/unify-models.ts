import 'dotenv/config';

import pool from '../../db/index.js';

async function unifyModels() {
  console.log('Starting model unification...');
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Truncate the unified models table
    console.log('Truncating unified models table...');
    await client.query('TRUNCATE TABLE models');

    // --- Migrate AI Studio Models ---
    console.log('Migrating AI Studio models...');
    const aiStudioResult = await client.query('SELECT * FROM ai_studio_models');
    for (const model of aiStudioResult.rows) {
      const modelName = (model.displayName || model.id || '').toLowerCase();
      const modelId = (model.id || '').toLowerCase();
      const hasVision =
        modelName.includes('vision') ||
        modelName.includes('image') ||
        modelId.includes('vision') ||
        modelId.includes('gemini');
      const hasThinking =
        model.thinking ||
        modelName.includes('think') ||
        modelName.includes('reason') ||
        modelName.includes('experiment');
      const hasEmbedding =
        model.supportedGenerationMethods?.includes('embedContent') ||
        modelName.includes('embed');
      const hasTools =
        model.supportedGenerationMethods?.includes('generateContent') ||
        model.supportedGenerationMethods?.includes('toolUse');

      await client.query(
        `INSERT INTO models (id, provider, name, description, context_length, tool_calling, vision, reasoning, embedding, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          model.id,
          'aistudio',
          model.displayName || model.id?.replace('models/', ''),
          model.description || '',
          model.inputTokenLimit || 0,
          hasTools,
          hasVision,
          hasThinking,
          hasEmbedding,
          model,
        ]
      );
    }
    console.log(`Migrated ${aiStudioResult.rowCount} AI Studio models.`);

    // --- Migrate OpenRouter Models ---
    console.log('Migrating OpenRouter models...');
    const openRouterResult = await client.query(
      'SELECT * FROM openrouter_models'
    );
    for (const model of openRouterResult.rows) {
      const modelName = (model.name || '').toLowerCase();
      const modelId = (model.id || '').toLowerCase();
      const hasVision =
        modelName.includes('vision') ||
        modelName.includes('image') ||
        modelId.includes('vision') ||
        model.architecture?.input_modalities?.includes('image');
      const hasThinking =
        modelName.includes('think') ||
        modelName.includes('reason') ||
        modelName.includes('o1') ||
        modelName.includes('experiment');
      const hasEmbedding =
        modelName.includes('embed') || modelId.includes('embed');
      const hasTools =
        model.supported_parameters?.includes('tools') ||
        model.supported_parameters?.includes('functions');

      await client.query(
        `INSERT INTO models (id, provider, name, description, context_length, tool_calling, vision, reasoning, embedding, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          model.id,
          'openrouter',
          model.name,
          model.description || '',
          model.context_length || 0,
          hasTools,
          hasVision,
          hasThinking,
          hasEmbedding,
          model,
        ]
      );
    }
    console.log(`Migrated ${openRouterResult.rowCount} OpenRouter models.`);

    await client.query('COMMIT');
    console.log('Model unification complete.');
  } catch (e) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error during model unification:', e);
    throw e;
  } finally {
    if (client) {
      client.release();
    }
  }
}

unifyModels()
  .then(() => {
    console.log('unify-models script finished successfully.');
    pool.end();
  })
  .catch(e => {
    console.error('unify-models script failed:', e);
    process.exit(1);
  });
