import { promises as fs } from 'fs';
import path from 'path';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { StateRepository } from './StateRepository.js';

const TEST_DIR_NAME = 'test-data';

describe('StateRepository', () => {
  let stateRepository: StateRepository;
  let testDataDir: string;

  // Before all tests, set up the test directory
  beforeAll(() => {
    testDataDir = path.resolve(__dirname, '../../', TEST_DIR_NAME);
    stateRepository = new StateRepository(TEST_DIR_NAME);
  });

  // After each test, clean up the created files and directories
  afterEach(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('writeJson and readJson', () => {
    const TEST_FILE_PATH = 'test-state.json';
    const EXPECTED_DATA = { version: 1, message: 'hello world' };

    it('should write data to a file and read it back successfully', async () => {
      // Act: Write the data
      await stateRepository.writeJson(TEST_FILE_PATH, EXPECTED_DATA);

      // Assert: Read the data back and verify it
      const readData = await stateRepository.readJson(TEST_FILE_PATH);
      expect(readData).toEqual(EXPECTED_DATA);
    });

    it('should create nested directories when writing', async () => {
      const nestedFilePath = 'nested/dir/test.json';
      await stateRepository.writeJson(nestedFilePath, EXPECTED_DATA);

      const readData = await stateRepository.readJson(nestedFilePath);
      expect(readData).toEqual(EXPECTED_DATA);
    });

    it('should perform an atomic write by not leaving a .tmp file', async () => {
      await stateRepository.writeJson(TEST_FILE_PATH, EXPECTED_DATA);

      const finalPath = path.join(testDataDir, TEST_FILE_PATH);
      const tempPath = `${finalPath}.tmp`;

      // Assert that the final file exists and the temp file does not
      await expect(fs.access(finalPath)).resolves.toBeUndefined();
      await expect(fs.access(tempPath)).rejects.toThrow();
    });
  });

  describe('readJson error handling', () => {
    it('should return null if the file does not exist', async () => {
      const readData = await stateRepository.readJson('non-existent-file.json');
      expect(readData).toBeNull();
    });

    it('should throw StateReadError for invalid JSON', async () => {
      const invalidJsonPath = 'invalid.json';
      const fullPath = path.join(testDataDir, invalidJsonPath);
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(fullPath, '{ "key": "value", }'); // Invalid JSON with trailing comma

      try {
        await stateRepository.readJson(invalidJsonPath);
        throw new Error('Expected readJson to throw StateReadError');
      } catch (_err) {
        expect(_err).toBeInstanceOf(Error);
        expect((_err as Error).name).toBe('StateReadError');
      }
    });
  });
});
