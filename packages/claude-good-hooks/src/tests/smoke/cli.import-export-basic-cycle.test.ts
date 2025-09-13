import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { runCLI } from './utils/cli-utils.js';
import fs from 'fs/promises';
import { testConfiguration } from './fixtures/import-export-test-config.js';
import { setupTestFiles, cleanupTestFiles, configPath, exportedPath } from './utils/test-setup.js';

describe('CLI Import/Export Basic Cycle', () => {
  beforeAll(async () => {
    await setupTestFiles();
  });

  afterAll(async () => {
    await cleanupTestFiles();
  });

  test('should import, export, and verify configuration integrity', async () => {
    // Step 1: Import the test configuration
    console.log('Step 1: Importing test configuration...');
    const importResult = await runCLI(
      ['import', configPath, '--scope', 'project', '--yes'],
      {
        timeout: 15000,
      }
    );

    expect(importResult.success).toBe(true);
    expect(importResult.stdout).toMatch(/Configuration imported successfully/i);
    expect(importResult.stdout).toMatch(/project settings/i);

    // Verify import statistics are shown
    expect(importResult.stdout).toMatch(/Import Summary/i);
    expect(importResult.stdout).toMatch(/Total hooks:/i);
    expect(importResult.stdout).toMatch(/Total events:/i);

    // Step 2: Export the configuration back out
    console.log('Step 2: Exporting configuration...');
    const exportResult = await runCLI(
      ['export', '--scope', 'project', '--output', exportedPath],
      {
        timeout: 15000,
      }
    );

    expect(exportResult.success).toBe(true);
    expect(exportResult.stdout).toMatch(/Configuration exported successfully/i);
    expect(exportResult.stdout).toMatch(/project/i);

    // Verify export statistics are shown
    expect(exportResult.stdout).toMatch(/Statistics:/i);
    expect(exportResult.stdout).toMatch(/Total hooks:/i);
    expect(exportResult.stdout).toMatch(/Total events:/i);

    // Step 3: Read and verify the exported configuration
    console.log('Step 3: Verifying exported configuration...');
    const exportedContent = await fs.readFile(exportedPath, 'utf8');
    const exportedConfig = JSON.parse(exportedContent);

    // Verify structure
    expect(exportedConfig).toHaveProperty('version');
    expect(exportedConfig).toHaveProperty('metadata');
    expect(exportedConfig).toHaveProperty('settings');

    // Verify metadata
    expect(exportedConfig.metadata).toHaveProperty('exported');
    expect(exportedConfig.metadata).toHaveProperty('source');
    expect(exportedConfig.metadata).toHaveProperty('generator', 'claude-good-hooks-cli');
    expect(exportedConfig.metadata.source).toContain('project');

    // Step 4: Deep comparison of hook configurations
    console.log('Step 4: Deep comparison of configurations...');
    const originalSettings = testConfiguration.settings;
    const exportedSettings = exportedConfig.settings;

    // Verify all hook types are present
    const expectedHookTypes = [
      'PreToolUse',
      'PostToolUse',
      'UserPromptSubmit',
      'Stop',
      'SubagentStop',
      'SessionEnd',
      'Notification',
      'PreCompact'
    ];

    for (const hookType of expectedHookTypes) {
      expect(exportedSettings.hooks).toHaveProperty(hookType);
      expect(exportedSettings.hooks[hookType]).toBeInstanceOf(Array);
    }

    // Verify PreToolUse hooks
    const preToolUseHooks = exportedSettings.hooks.PreToolUse;
    expect(preToolUseHooks).toHaveLength(originalSettings.hooks.PreToolUse.length);

    // Verify specific hook matcher and command preservation
    const writeEditHook = preToolUseHooks.find(h => h.matcher === 'Write|Edit');
    expect(writeEditHook).toBeDefined();
    expect(writeEditHook.hooks[0].command).toContain('Pre-tool validation for Write/Edit');
    expect(writeEditHook.hooks[0].timeout).toBe(30);
  }, 30000); // 30 second timeout for comprehensive test
});