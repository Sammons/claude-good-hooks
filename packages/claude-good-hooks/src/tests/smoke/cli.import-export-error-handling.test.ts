import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { runCLI } from './utils/cli-utils.js';
import fs from 'fs/promises';
import path from 'path';
import { setupTestFiles, cleanupTestFiles, testDir } from './utils/test-setup.js';

describe('CLI Import/Export Error Handling', () => {
  beforeAll(async () => {
    await setupTestFiles();
  });

  beforeEach(async () => {
    // Clean up project settings before each test for isolation
    try {
      await fs.rm('.claude', { recursive: true, force: true });
    } catch {
      // Ignore - directory might not exist
    }
    // Ensure test directory exists after cleanup
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await cleanupTestFiles();
  });

  test('should handle import/export errors gracefully', async () => {
    // Test importing non-existent file
    const nonExistentResult = await runCLI(
      ['import', '/path/that/does/not/exist.json', '--scope', 'project'],
      { timeout: 5000 }
    );
    expect(nonExistentResult.success).toBe(false);
    expect(nonExistentResult.stderr).toMatch(/(not found|does not exist|ENOENT)/i);

    // Test importing invalid JSON
    const invalidJsonPath = path.join(testDir, 'invalid.json');
    await fs.writeFile(invalidJsonPath, '{ invalid json content', 'utf8');

    const invalidJsonResult = await runCLI(
      ['import', invalidJsonPath, '--scope', 'project'],
      { timeout: 5000 }
    );
    expect(invalidJsonResult.success).toBe(false);
    expect(invalidJsonResult.stderr).toMatch(/(parse|json|syntax)/i);

    // Test exporting to invalid directory
    const invalidExportResult = await runCLI(
      ['export', '--scope', 'project', '--output', '/invalid/path/export.json'],
      { timeout: 5000 }
    );
    expect(invalidExportResult.success).toBe(false);
    expect(invalidExportResult.stderr).toMatch(/(permission|not found|ENOENT|EACCES|no hooks found)/i);
  }, 20000);
});