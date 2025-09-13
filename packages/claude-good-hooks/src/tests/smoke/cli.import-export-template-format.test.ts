import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { runCLI } from './utils/cli-utils.js';
import fs from 'fs/promises';
import path from 'path';
import { setupTestFiles, cleanupTestFiles, configPath, testDir } from './utils/test-setup.js';

describe('CLI Import/Export Template Format', () => {
  beforeAll(async () => {
    await setupTestFiles();
  });

  afterAll(async () => {
    await cleanupTestFiles();
  });

  test('should support template export format', async () => {
    // First import our test config
    await runCLI(['import', configPath, '--scope', 'project', '--yes'], { timeout: 10000 });

    const templateExportPath = path.join(testDir, 'export.template');
    const templateResult = await runCLI(
      ['export', '--scope', 'project', '--format', 'template', '--output', templateExportPath],
      { timeout: 10000 }
    );

    expect(templateResult.success).toBe(true);

    // Verify template file was created and contains expected structure
    const templateContent = await fs.readFile(templateExportPath, 'utf8');
    expect(templateContent).toMatch(/# Claude Good Hooks Configuration Template/i);
    expect(templateContent).toMatch(/hooks:/);
    expect(templateContent).toMatch(/PreToolUse:/);

    // Should contain template-style comments
    expect(templateContent).toMatch(/#.*configure/i);
  }, 15000);
});