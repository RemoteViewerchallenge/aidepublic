import { promises as fs } from 'fs';
import path from 'path';
import { StateReadError } from '../core/customErrors';
import { HealthStatus, ProviderId } from '../types/provider';

/**
 * @file This module's only job is to safely read and write data to the filesystem.
 *
 * Main Values Passed:
 * It takes a `JavaScript object` and a `file path` for writing. When reading, it
 * returns the `parsed JavaScript object` from a file.
 *
 * Why It's Necessary:
 * An application that can't remember anything is. This module provides the
 * system's memory, but with a critical safety feature: atomic writes. This prevents
 * our state files from becoming corrupted if the server crashes mid-operation,
 * which is essential for a reliable autonomous system.
 *
 * Main Parts:
 * - `class StateRepository`: The main class for handling state persistence.
 * - `writeJson()`, `readJson()`: The primary methods for file interaction.
 */

export interface StoredProviderState {
  id: ProviderId;
  healthStatus: HealthStatus;
  lastHealthCheck: number;
}

export class StateRepository {
  private baseDir: string;

  constructor(relativeBaseDir: string = 'state') {
    // Resolve path from the project root. This is robust for a Node.js application.
    this.baseDir = path.resolve(process.cwd(), relativeBaseDir);
  }

  async writeJson<T>(filePath: string, data: T): Promise<void> {
    const finalPath = path.join(this.baseDir, filePath);
    const tempPath = `${finalPath}.tmp`;

    await fs.mkdir(path.dirname(finalPath), { recursive: true });

    const jsonString = JSON.stringify(data, null, 2);

    await fs.writeFile(tempPath, jsonString, 'utf-8');

    await fs.rename(tempPath, finalPath);
  }

  async readJson<T>(filePath: string): Promise<T | null> {
    const finalPath = path.join(this.baseDir, filePath);

    try {
      const fileContent = await fs.readFile(finalPath, 'utf-8');
      return JSON.parse(fileContent) as T;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new StateReadError(
        `Failed to read or parse JSON from ${filePath}`,
        error
      );
    }
  }

  private getProviderStateFilePath(providerId: ProviderId): string {
    return `provider_states/${providerId}.json`;
  }

  async getProviderState(
    providerId: ProviderId
  ): Promise<StoredProviderState | null> {
    const filePath = this.getProviderStateFilePath(providerId);
    return this.readJson<StoredProviderState>(filePath);
  }

  async setProviderState(state: StoredProviderState): Promise<void> {
    const filePath = this.getProviderStateFilePath(state.id);
    await this.writeJson(filePath, state);
  }
}
