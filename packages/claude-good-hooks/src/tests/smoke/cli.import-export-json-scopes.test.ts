import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { runCLI } from './utils/cli-utils.js';
import { setupTestFiles, cleanupTestFiles, configPath, testDir } from './utils/test-setup.js';
import fs from 'fs/promises';
import path from 'path';

describe('CLI Import/Export JSON Format with Scopes', () => {
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

  test('should handle JSON format import/export with all scopes', async () => {
    // Test project scope
    const projectResult = await runCLI(
      ['import', configPath, '--scope', 'project', '--yes'],
      { timeout: 10000 }
    );
    expect(projectResult.success).toBe(true);
    expect(projectResult.stdout).toMatch(/project/i);

    // Export to a file to test JSON format
    const exportPath = path.join(testDir, 'scopes-export.json');
    const projectExport = await runCLI(
      ['export', '--scope', 'project', '--format', 'json', '--output', exportPath],
      { timeout: 10000 }
    );
    expect(projectExport.success).toBe(true);
    expect(projectExport.stdout).toMatch(/project/i);
    expect(projectExport.stdout).toMatch(/Configuration exported successfully/i);

    // Verify JSON output file is valid
    const exportContent = await fs.readFile(exportPath, 'utf8');
    const projectConfig = JSON.parse(exportContent);
    expect(projectConfig).toHaveProperty('settings');
    expect(projectConfig.metadata.source).toContain('project');
  }, 15000);
});