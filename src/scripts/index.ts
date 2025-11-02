import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Pool } from 'pg';
import { getEnv } from '../core/utils/env';

const connectionString = getEnv('PG_CONNECTION');
console.log('Using PG_CONNECTION:', connectionString);

const pool = new Pool({
  connectionString,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;