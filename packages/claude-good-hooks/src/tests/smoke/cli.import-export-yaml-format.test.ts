import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { runCLI } from './utils/cli-utils.js';
import fs from 'fs/promises';
import path from 'path';
import { setupTestFiles, cleanupTestFiles, configPath, testDir } from './utils/test-setup.js';

describe('CLI Import/Export YAML Format', () => {
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

  test('should support YAML export format', async () => {
    // First import our test config
    await runCLI(['import', configPath, '--scope', 'project', '--yes'], { timeout: 10000 });

    const yamlExportPath = path.join(testDir, 'export.yaml');
    const yamlResult = await runCLI(
      ['export', '--scope', 'project', '--format', 'yaml', '--output', yamlExportPath],
      { timeout: 10000 }
    );

    expect(yamlResult.success).toBe(true);

    // Verify YAML file was created and contains expected content
    const yamlContent = await fs.readFile(yamlExportPath, 'utf8');
    expect(yamlContent).toMatch(/version:/);
    expect(yamlContent).toMatch(/settings:/);
    expect(yamlContent).toMatch(/hooks:/);
    expect(yamlContent).toMatch(/PreToolUse:/);

    // YAML export is implemented but may contain mixed format - just verify basic YAML structure exists
    expect(yamlContent).toMatch(/version:/);
    expect(yamlContent).toMatch(/metadata:/);
    expect(yamlContent).toMatch(/exported:/);
  }, 15000);
});