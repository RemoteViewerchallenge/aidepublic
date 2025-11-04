import path from 'path';

import dotenv from 'dotenv';
import { Pool } from 'pg';

import { getEnv } from '../core/utils/env';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = getEnv('PG_CONNECTION');
console.log('Using PG_CONNECTION:', connectionString);

const pool = new Pool({
  connectionString,
});

pool.on('error', (err, _client) => {
  console.error('Unexpected error on idle _client', err);
  process.exit(-1);
});

export default pool;