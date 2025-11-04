/* Type declarations for Deno sqlite module to satisfy TypeScript when remote types are unavailable */
declare module 'https://deno.land/x/sqlite/mod.ts' {
  export class DB {
    constructor(path?: string | Uint8Array);
    query(sql: string, ...args: any[]): any;
    close(): void;
  }
}

// Shared database utilities for lootbox SQLite database
// Provides centralized connection management and schema initialization

import { DB } from 'https://deno.land/x/sqlite/mod.ts';
import { join } from 'jsr:@std/path';

// Provide small runtime-agnostic helpers so TypeScript doesn't error on the Deno global.
// Use Deno when available, otherwise fall back to Node.js equivalents.
const deno = (globalThis as any).Deno;

function getPlatform(): string {
  if (deno && deno.build && deno.build.os) {
    return deno.build.os;
  }
  if (typeof process !== 'undefined') {
    const p = process.platform;
    if (p === 'win32') return 'windows';
    if (p === 'darwin') return 'darwin';
    return 'linux';
  }
  return 'linux';
}

function getEnv(name: string): string | undefined {
  if (deno && deno.env && typeof deno.env.get === 'function') {
    return deno.env.get(name);
  }
  if (typeof process !== 'undefined' && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  return undefined;
}

function getCwd(): string {
  if (deno && typeof deno.cwd === 'function') {
    return deno.cwd();
  }
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    return process.cwd();
  }
  return '.';
}

async function mkdirRecursive(path: string): Promise<void> {
  if (deno && typeof deno.mkdir === 'function') {
    try {
      await deno.mkdir(path, { recursive: true });
    } catch (error) {
      if (
        !(deno && deno.errors && error instanceof deno.errors.AlreadyExists)
      ) {
        throw error;
      }
    }
  } else {
    // Node.js fallback
    const { mkdir } = await import('node:fs/promises');
    try {
      await mkdir(path, { recursive: true });
    } catch {
      // ignore errors for existing directories
    }
  }
}

/**
 * Get platform-specific data directory following XDG Base Directory spec
 */
function getDefaultDataDir(): string {
  const platform = getPlatform();

  if (platform === 'windows') {
    const appData = getEnv('APPDATA') || getEnv('USERPROFILE');
    return appData ? join(appData, 'lootbox') : join(getCwd(), 'lootbox-data');
  } else if (platform === 'darwin') {
    const home = getEnv('HOME');
    return home
      ? join(home, 'Library', 'Application Support', 'lootbox')
      : join(getCwd(), 'lootbox-data');
  } else {
    // Linux/Unix - follow XDG spec
    const xdgDataHome = getEnv('XDG_DATA_HOME');
    const home = getEnv('HOME');
    if (xdgDataHome) {
      return join(xdgDataHome, 'lootbox');
    } else if (home) {
      return join(home, '.local', 'share', 'lootbox');
    }
    return join(getCwd(), 'lootbox-data');
  }
}

/**
 * Get the database file path
 */
async function getDbPath(): Promise<string> {
  const { get_config } = await import('./get_config.ts');
  const config = await get_config();
  const baseDir = config.lootbox_data_dir || getDefaultDataDir();
  return join(baseDir, 'lootbox.db');
}

/**
 * Ensure the database directory exists
 */
async function ensureDbDir(dbPath: string): Promise<void> {
  const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
  await mkdirRecursive(dir);
}

let dbInstance: DB | null = null;
let schemaInitialized = false;

/**
 * Initialize all database schemas
 */
function initializeSchemas(db: DB): void {
  if (schemaInitialized) return;

  // Workflow events table
  db.query(`
    CREATE TABLE IF NOT EXISTS workflow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      workflow_file TEXT NOT NULL,
      step_number INTEGER,
      loop_iteration INTEGER,
      reason TEXT,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.query(`
    CREATE INDEX IF NOT EXISTS idx_workflow_events_timestamp
    ON workflow_events(timestamp)
  `);

  db.query(`
    CREATE INDEX IF NOT EXISTS idx_workflow_events_workflow_file
    ON workflow_events(workflow_file)
  `);

  // Script runs table
  db.query(`
    CREATE TABLE IF NOT EXISTS script_runs (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      script TEXT NOT NULL,
      success INTEGER NOT NULL,
      output TEXT,
      error TEXT,
      duration_ms INTEGER,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.query(`
    CREATE INDEX IF NOT EXISTS idx_script_runs_timestamp
    ON script_runs(timestamp)
  `);

  db.query(`
    CREATE INDEX IF NOT EXISTS idx_script_runs_session_id
    ON script_runs(session_id)
  `);

  db.query(`
    CREATE INDEX IF NOT EXISTS idx_script_runs_success
    ON script_runs(success)
  `);

  schemaInitialized = true;
}

/**
 * Get or create database connection and initialize all schemas
 * This is a singleton - all modules share the same connection
 */
export async function getDb(): Promise<DB> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = await getDbPath();
  await ensureDbDir(dbPath);

  dbInstance = new DB(dbPath);
  initializeSchemas(dbInstance);

  return dbInstance;
}

/**
 * Close the database connection
 * Should be called when shutting down the application
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    schemaInitialized = false;
  }
}
