import pg from 'pg';
import { getEnv } from '../utils/env';

const { Pool } = pg;

const connectionString = getEnv('PG_CONNECTION');

const pool = new Pool({
  connectionString,
});

export default pool;
