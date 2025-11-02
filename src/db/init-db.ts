import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
  console.log('Attempting to initialize database...');
  let client;
  try {
    console.log('Connecting to the database...');
    client = await pool.connect();
    console.log('Database connection successful.');

    console.log('Starting transaction...');
    await client.query('BEGIN');
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema from: ${schemaPath}`);
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('Executing schema...');
    await client.query(schema);
    console.log('Schema executed successfully.');
    console.log('Committing transaction...');
    await client.query('COMMIT');
    console.log('Database initialized successfully.');
  } catch (e) {
    console.error('Caught an error during DB initialization:', e);
    if (client) {
      try {
        console.log('Rolling back transaction...');
        await client.query('ROLLBACK');
        console.log('Transaction rolled back.');
      } catch (rollbackError) {
        console.error('Error during transaction rollback:', rollbackError);
      }
    }
    throw e;
  } finally {
    if (client) {
      console.log('Releasing client.');
      client.release();
    }
  }
}

initDb()
  .then(() => {
    console.log('DB Init Script finished successfully.');
  })
  .catch(e => {
    console.error('DB Init Script failed to run.', e);
    process.exit(1);
  })
  .finally(() => {
    pool.end(() => {
      console.log('Database pool has been closed.');
    });
  });
