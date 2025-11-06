import './config.js'; // This MUST be the first import

// eslint-disable-next-line import/order
import pool from '../../db/index.js';

async function unifyModels() {
  console.log('Starting model unification...');
  let client;
  try {
    client = await pool.connect();

    // --- Schema Validation ---
    // Check if the 'is_free' column exists and add it if it doesn't.
    // This makes the script resilient to database schema changes.
    const colCheck = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='models' AND column_name='is_free'
    `);

    if (colCheck.rowCount === 0) {
      console.log('Adding "is_free" column to "models" table...');
      await client.query(
        'ALTER TABLE models ADD COLUMN is_free BOOLEAN NOT NULL DEFAULT false'
      );
    }

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
        `INSERT INTO models (id, provider, name, description, context_length, tool_calling, vision, reasoning, embedding, raw_data, is_free)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
          true, // All AI Studio models are considered free tier
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

      // Determine if the model is free based on pricing or name
      let isPricingFree = false;
      // Defensively check the pricing object. This is the "0,0,0,0" check you liked.
      if (model.raw_data && typeof model.raw_data.pricing === 'object') {
        const pricing = model.raw_data.pricing;
        // Ensure that if prompt or completion prices exist, they are zero.
        // If they don't exist, we don't consider it free based on pricing.
        const promptPrice = parseFloat(pricing.prompt || '1');
        const completionPrice = parseFloat(pricing.completion || '1');
        isPricingFree = promptPrice === 0 && completionPrice === 0;
      }

      const isNameFree =
        typeof model.id === 'string' &&
        model.id.toLowerCase().endsWith(':free');
      const isFree = isPricingFree || isNameFree;

      await client.query(
        `INSERT INTO models (id, provider, name, description, context_length, tool_calling, vision, reasoning, embedding, raw_data, is_free)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
          model.raw_data, // Use the original raw_data, not the whole row
          isFree,
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
