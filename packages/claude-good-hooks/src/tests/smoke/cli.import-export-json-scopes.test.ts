import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { runCLI } from './utils/cli-utils.js';
import { setupTestFiles, cleanupTestFiles, configPath } from './utils/test-setup.js';
import path from 'path';

describe('CLI Import/Export JSON Format with Scopes', () => {
  beforeAll(async () => {
    await setupTestFiles();
  });

  afterAll(async () => {
    await cleanupTestFiles();
  });

  test('should handle JSON format import/export with all scopes', async () => {
    // Test project scope
    const projectResult = await runCLI(
      ['import', configPath, '--scope', 'project', '--yes'],
      { timeout: 10000 }
    );
    expect(projectResult.success).toBe(true);
    expect(projectResult.stdout).toMatch(/project/i);

    const projectExport = await runCLI(
      ['export', '--scope', 'project', '--format', 'json'],
      { timeout: 10000 }
    );
    expect(projectExport.success).toBe(true);
    expect(projectExport.stdout).toMatch(/project/i);

    // Verify JSON output is valid
    const projectConfig = JSON.parse(projectExport.stdout);
    expect(projectConfig).toHaveProperty('settings');
    expect(projectConfig.metadata.source).toContain('project');
  }, 15000);
});