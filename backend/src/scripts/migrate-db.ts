import 'dotenv/config';

import pool from '../../../db/index.js';

async function runMigrations() {
  let client;
  try {
    client = await pool.connect();
    console.log('🚀 Running database migrations...');

    const columns = [
      { name: 'use_point', type: 'INTEGER', default: 'DEFAULT 0' },
      { name: 'last_used_at', type: 'TIMESTAMP WITH TIME ZONE', default: '' },
      { name: 'rpm', type: 'INTEGER', default: '' },
      { name: 'blacklisted', type: 'BOOLEAN', default: 'DEFAULT false' },
    ];

    for (const column of columns) {
      const checkColumnQuery = `
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='models' AND column_name='${column.name}';
      `;
      const res = await client.query(checkColumnQuery);

      if (res.rowCount === 0) {
        console.log(`   -> Column '${column.name}' not found. Adding it...`);
        const addColumnQuery = `
          ALTER TABLE models 
          ADD COLUMN ${column.name} ${column.type} ${column.default};
        `;
        await client.query(addColumnQuery);
        console.log(`   ✅ Column '${column.name}' added.`);
      } else {
        console.log(`   ✓ Column '${column.name}' already exists.`);
      }
    }

    console.log('✅ Database migrations completed successfully.');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    // Re-throw the error to stop the startup process if migrations fail
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

runMigrations()
  .then(() => {
    pool.end(); // End the pool to allow the script to exit cleanly
  })
  .catch(() => {
    process.exit(1); // Exit with an error code if migrations fail
  });
