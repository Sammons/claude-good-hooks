import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { runCLI } from './utils/cli-utils.js';
import fs from 'fs/promises';
import path from 'path';
import { setupTestFiles, cleanupTestFiles, testDir } from './utils/test-setup.js';

describe('CLI Import/Export Hook Property Preservation', () => {
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

  test('should preserve all hook properties during import/export cycle', async () => {
    // Create a configuration with complex hook properties
    const complexConfig = {
      version: '1.0.0',
      metadata: {
        exported: '2024-01-01T12:00:00Z',
        source: ['project'],
        generator: 'test',
      },
      settings: {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Write',
              hooks: [
                {
                  type: 'command',
                  command: 'echo "complex command with special chars: $@#%"',
                  timeout: 42,
                },
              ],
            },
          ],
          PostToolUse: [
            {
              matcher: '.*regex.*',
              hooks: [
                {
                  type: 'command',
                  command: 'multi\nline\ncommand',
                  timeout: 123,
                },
              ],
            },
          ],
        },
      },
    };

    const complexPath = path.join(testDir, 'complex-config.json');
    await fs.writeFile(complexPath, JSON.stringify(complexConfig, null, 2), 'utf8');

    // Import the complex configuration
    const importResult = await runCLI(
      ['import', complexPath, '--scope', 'project', '--yes'],
      { timeout: 10000 }
    );
    expect(importResult.success).toBe(true);

    // Export it back
    const exportPath = path.join(testDir, 'complex-export.json');
    const exportResult = await runCLI(
      ['export', '--scope', 'project', '--output', exportPath],
      { timeout: 10000 }
    );
    expect(exportResult.success).toBe(true);

    // Verify all properties are preserved
    const exportedContent = await fs.readFile(exportPath, 'utf8');
    const exportedConfig = JSON.parse(exportedContent);

    const preToolUseHook = exportedConfig.settings.hooks.PreToolUse[0].hooks[0];
    expect(preToolUseHook.command).toBe('echo "complex command with special chars: $@#%"');
    expect(preToolUseHook.timeout).toBe(42);

    const postToolUseHook = exportedConfig.settings.hooks.PostToolUse[0].hooks[0];
    expect(postToolUseHook.command).toBe('multi\nline\ncommand');
    expect(postToolUseHook.timeout).toBe(123);
    expect(exportedConfig.settings.hooks.PostToolUse[0].matcher).toBe('.*regex.*');
  }, 15000);

  test('should handle edge cases in hook properties', async () => {
    const edgeCaseConfig = {
      version: '1.0.0',
      metadata: {
        exported: '2024-01-01T12:00:00Z',
        source: ['project'],
        generator: 'test',
      },
      settings: {
        hooks: {
          PreToolUse: [
            {
              matcher: '',
              hooks: [{ type: 'command', command: '' }],
            },
            {
              matcher: 'unicode-test-🚀',
              hooks: [{ type: 'command', command: 'echo "unicode: 你好 🌟"' }],
            },
          ],
        },
      },
    };

    const edgeCasePath = path.join(testDir, 'edge-case-config.json');
    const edgeExportPath = path.join(testDir, 'edge-case-export.json');

    await fs.writeFile(edgeCasePath, JSON.stringify(edgeCaseConfig, null, 2), 'utf8');

    const importResult = await runCLI(
      ['import', edgeCasePath, '--scope', 'project', '--yes'],
      { timeout: 10000 }
    );
    expect(importResult.success).toBe(true);

    const exportResult = await runCLI(
      ['export', '--scope', 'project', '--output', edgeExportPath],
      { timeout: 10000 }
    );
    expect(exportResult.success).toBe(true);

    const exportedContent = await fs.readFile(edgeExportPath, 'utf8');
    const exportedConfig = JSON.parse(exportedContent);

    expect(exportedConfig.settings.hooks.PreToolUse).toHaveLength(2);
    expect(exportedConfig.settings.hooks.PreToolUse[1].matcher).toBe('unicode-test-🚀');
    expect(exportedConfig.settings.hooks.PreToolUse[1].hooks[0].command).toBe('echo "unicode: 你好 🌟"');
  }, 15000);
});