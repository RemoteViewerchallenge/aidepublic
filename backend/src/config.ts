/**
 * @file config.ts
 * @description This is the first file to be imported in any script.
 * It correctly loads environment variables from the project root .env file.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
