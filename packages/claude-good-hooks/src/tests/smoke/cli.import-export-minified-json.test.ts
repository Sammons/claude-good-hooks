import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { runCLI } from './utils/cli-utils.js';
import fs from 'fs/promises';
import path from 'path';
import { setupTestFiles, cleanupTestFiles, configPath, testDir } from './utils/test-setup.js';

describe('CLI Import/Export Minified JSON', () => {
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

  test('should support minified JSON export', async () => {
    // First import our test config
    await runCLI(['import', configPath, '--scope', 'project', '--yes'], { timeout: 10000 });

    const minifiedExportPath = path.join(testDir, 'export-minified.json');
    const minifiedResult = await runCLI(
      ['export', '--scope', 'project', '--format', 'json', '--minify', '--output', minifiedExportPath],
      { timeout: 10000 }
    );

    expect(minifiedResult.success).toBe(true);

    // Verify minified JSON was created
    const minifiedContent = await fs.readFile(minifiedExportPath, 'utf8');
    const parsedMinified = JSON.parse(minifiedContent);

    expect(parsedMinified).toHaveProperty('settings');
    expect(parsedMinified.settings).toHaveProperty('hooks');

    // Minified JSON should not contain unnecessary whitespace
    expect(minifiedContent).not.toMatch(/\n\s+/);
    expect(minifiedContent.length).toBeLessThan(minifiedContent.replace(/\s+/g, ' ').length * 1.5);
  }, 15000);
});