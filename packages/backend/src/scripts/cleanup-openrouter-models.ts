import 'dotenv/config';

import pool from '../../../db/index.js';

async function cleanupOpenRouterModels() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Delete all non-free models from openrouter_models table
    const deleteResult = await client.query(`
      DELETE FROM openrouter_models 
      WHERE NOT (
        pricing->>'image' = '0' AND
        pricing->>'prompt' = '0' AND
        pricing->>'request' = '0' AND
        pricing->>'completion' = '0' AND
        pricing->>'web_search' = '0' AND
        pricing->>'internal_reasoning' = '0'
      )
    `);

    console.log(
      `🗑️  Deleted ${deleteResult.rowCount} non-free models from openrouter_models table`
    );

    // Check remaining count
    const countResult = await client.query(
      'SELECT COUNT(*) FROM openrouter_models'
    );
    console.log(`✅ Remaining free models: ${countResult.rows[0].count}`);

    await client.query('COMMIT');
    console.log(
      '✅ Successfully cleaned up openrouter_models table - only FREE models remain!'
    );
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Failed to cleanup openrouter_models:', error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

cleanupOpenRouterModels();
