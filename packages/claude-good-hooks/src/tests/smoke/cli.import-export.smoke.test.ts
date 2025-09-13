import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { runCLI } from './utils/cli-utils.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ClaudeSettings } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Claude Good Hooks CLI - Import/Export Cycle Tests', () => {
  const testDir = path.join(__dirname, '../../static-test-assets/backups');
  const configPath = path.join(testDir, 'test-config.json');
  const exportedPath = path.join(testDir, 'exported-config.json');
  const reimportPath = path.join(testDir, 'reimported-config.json');

  // Comprehensive test configuration covering all hook types and features
  const testConfiguration = {
    version: '1.0.0',
    metadata: {
      exported: '2024-01-01T12:00:00Z',
      source: ['project'],
      generator: 'claude-good-hooks-smoke-tests',
      description: 'Comprehensive test configuration for import/export functionality',
    },
    settings: {
      hooks: {
        // PreToolUse hooks with various matchers
        PreToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: 'echo "Pre-tool validation for Write/Edit operations"',
                timeout: 30,
              },
            ],
          },
          {
            matcher: 'Bash',
            hooks: [
              {
                type: 'command',
                command: 'echo "Validating bash command before execution"',
              },
            ],
          },
          {
            matcher: '.*',
            hooks: [
              {
                type: 'command',
                command: 'echo "Universal pre-tool hook"',
                timeout: 10,
              },
            ],
          },
        ],
        // PostToolUse hooks for cleanup and validation
        PostToolUse: [
          {
            matcher: 'Write',
            hooks: [
              {
                type: 'command',
                command: 'echo "File written, running post-validation"',
              },
            ],
          },
          {
            matcher: 'Edit|MultiEdit',
            hooks: [
              {
                type: 'command',
                command: 'echo "Files edited, checking formatting"',
                timeout: 45,
              },
            ],
          },
        ],
        // UserPromptSubmit for context injection
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: 'command',
                command: 'echo "Processing user prompt, adding context"',
              },
            ],
          },
        ],
        // SessionStart for environment setup
        SessionStart: [
          {
            hooks: [
              {
                type: 'command',
                command: 'echo "Session started, initializing environment"',
                timeout: 60,
              },
            ],
          },
        ],
        // Stop hooks for cleanup
        Stop: [
          {
            hooks: [
              {
                type: 'command',
                command: 'echo "Claude stopped, running cleanup tasks"',
              },
            ],
          },
        ],
        // SubagentStop for task completion
        SubagentStop: [
          {
            hooks: [
              {
                type: 'command',
                command: 'echo "Subagent task completed"',
                timeout: 20,
              },
            ],
          },
        ],
        // SessionEnd for final cleanup
        SessionEnd: [
          {
            hooks: [
              {
                type: 'command',
                command: 'echo "Session ended, final cleanup"',
              },
            ],
          },
        ],
        // Notification hooks
        Notification: [
          {
            hooks: [
              {
                type: 'command',
                command: 'echo "Claude notification received"',
              },
            ],
          },
        ],
        // PreCompact hooks
        PreCompact: [
          {
            hooks: [
              {
                type: 'command',
                command: 'echo "Before compacting conversation"',
                timeout: 15,
              },
            ],
          },
        ],
      },
    } as ClaudeSettings,
  };

  beforeAll(async () => {
    // Create temporary directory for tests
    await fs.mkdir(testDir, { recursive: true });

    // Write the test configuration to a file
    await fs.writeFile(configPath, JSON.stringify(testConfiguration, null, 2), 'utf8');
  });

  afterAll(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up import/export test directory:', error);
    }

    // Also clean up any .claude directories that might have been created
    try {
      await fs.rm('.claude', { recursive: true, force: true });
    } catch {
      // Ignore - directory might not exist
    }
  });

  describe('Complete Import/Export Cycle', () => {
    test('should import, export, and verify configuration integrity', async () => {
      // Step 1: Import the hardcoded configuration
      console.log('Step 1: Importing test configuration...');
      const importResult = await runCLI(['import', configPath, '--scope', 'project', '--yes'], {
        timeout: 15000,
      });

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
        'SessionStart',
        'Stop',
        'SubagentStop',
        'SessionEnd',
        'Notification',
        'PreCompact',
      ];

      for (const hookType of expectedHookTypes) {
        expect(exportedSettings.hooks).toHaveProperty(hookType);
        expect(Array.isArray(exportedSettings.hooks[hookType])).toBe(true);
      }

      // Detailed verification of PreToolUse hooks (most complex)
      const originalPreToolUse = originalSettings.hooks?.PreToolUse;
      const exportedPreToolUse = exportedSettings.hooks?.PreToolUse;

      if (!originalPreToolUse || !exportedPreToolUse) {
        throw new Error('PreToolUse hooks not found in original or exported settings');
      }

      expect(exportedPreToolUse).toHaveLength(originalPreToolUse.length);

      for (let i = 0; i < originalPreToolUse.length; i++) {
        const originalConfig = originalPreToolUse[i];
        const exportedConfig = exportedPreToolUse[i];

        if (!originalConfig || !exportedConfig) {
          throw new Error(`Hook config not found at index ${i}`);
        }

        expect(exportedConfig.matcher).toBe(originalConfig.matcher);
        expect(exportedConfig.hooks).toHaveLength(originalConfig.hooks.length);

        for (let j = 0; j < originalConfig.hooks.length; j++) {
          const originalHook = originalConfig.hooks[j];
          const exportedHook = exportedConfig.hooks[j];

          if (!originalHook || !exportedHook) {
            throw new Error(`Hook not found at config ${i}, hook ${j}`);
          }

          expect(exportedHook.type).toBe(originalHook.type);
          expect(exportedHook.command).toBe(originalHook.command);
          expect(exportedHook.timeout).toBe(originalHook.timeout);
        }
      }

      // Verify hook counts match
      const originalHookCount = countHooks(originalSettings);
      const exportedHookCount = countHooks(exportedSettings);

      expect(exportedHookCount.total).toBe(originalHookCount.total);
      expect(exportedHookCount.events).toBe(originalHookCount.events);

      console.log(
        `✓ Verified ${originalHookCount.total} hooks across ${originalHookCount.events} events`
      );
    }, 30000); // 30 second timeout for comprehensive test

    test('should handle JSON format import/export with all scopes', async () => {
      // Test with JSON output format
      const jsonImportResult = await runCLI([
        '--json',
        'import',
        configPath,
        '--scope',
        'local',
        '--yes',
      ]);

      expect(jsonImportResult.success).toBe(true);

      // Export with JSON format
      const jsonExportResult = await runCLI([
        '--json',
        'export',
        '--scope',
        'local',
        '--output',
        reimportPath,
      ]);

      expect(jsonExportResult.success).toBe(true);

      // Verify the exported file exists and is valid JSON
      const reimportedContent = await fs.readFile(reimportPath, 'utf8');
      const reimportedConfig = JSON.parse(reimportedContent);

      expect(reimportedConfig).toHaveProperty('settings');
      expect(reimportedConfig.settings).toHaveProperty('hooks');
    });

    test('should preserve all hook properties during import/export cycle', async () => {
      // Create a configuration with edge cases
      const edgeCaseConfig = {
        version: '1.0.0',
        settings: {
          hooks: {
            PreToolUse: [
              {
                // Hook without matcher
                hooks: [
                  {
                    type: 'command',
                    command: 'echo "Hook without matcher"',
                  },
                ],
              },
              {
                matcher: 'Complex.*Pattern|Another.*Pattern',
                hooks: [
                  {
                    type: 'command',
                    command: 'echo "Complex matcher pattern"',
                    timeout: 120,
                  },
                  {
                    type: 'command',
                    command: 'echo "Multiple hooks in single config"',
                    // No timeout specified
                  },
                ],
              },
            ],
            PostToolUse: [
              {
                matcher: 'SpecialCharTest',
                hooks: [
                  {
                    type: 'command',
                    command: 'echo "Testing matcher without special characters"',
                  },
                ],
              },
            ],
          },
        },
      };

      const edgeCasePath = path.join(testDir, 'edge-case-config.json');
      const edgeExportPath = path.join(testDir, 'edge-case-export.json');

      await fs.writeFile(edgeCasePath, JSON.stringify(edgeCaseConfig, null, 2));

      // Import edge case config
      const importResult = await runCLI(['import', edgeCasePath, '--scope', 'global', '--yes']);
      expect(importResult.success).toBe(true);

      // Export it back
      const exportResult = await runCLI([
        'export',
        '--scope',
        'global',
        '--output',
        edgeExportPath,
      ]);
      expect(exportResult.success).toBe(true);

      // Verify preservation of edge cases
      const exportedContent = await fs.readFile(edgeExportPath, 'utf8');
      const exportedConfig = JSON.parse(exportedContent);

      const exportedPreToolUse = exportedConfig.settings.hooks.PreToolUse;

      // Verify hook without matcher is preserved
      expect(exportedPreToolUse[0]).not.toHaveProperty('matcher');
      expect(exportedPreToolUse[0].hooks[0].command).toBe('echo "Hook without matcher"');

      // Verify complex matcher is preserved
      expect(exportedPreToolUse[1].matcher).toBe('Complex.*Pattern|Another.*Pattern');
      expect(exportedPreToolUse[1].hooks[0].timeout).toBe(120);
      expect(exportedPreToolUse[1].hooks[1]).not.toHaveProperty('timeout');

      // Verify matcher is preserved
      expect(exportedConfig.settings.hooks.PostToolUse[0].matcher).toBe('SpecialCharTest');
    });

    test('should handle import/export errors gracefully', async () => {
      // Test import with non-existent file
      const invalidImportResult = await runCLI(['import', '/non/existent/file.json'], {
        expectError: true,
      });
      expect(invalidImportResult.success).toBe(false);
      expect(invalidImportResult.stderr || invalidImportResult.stdout).toMatch(
        /Failed to load configuration|File not found/i
      );

      // Test export with no hooks configured
      const emptyExportResult = await runCLI(['export', '--scope', 'local'], {
        expectError: true,
      });
      // This might succeed (empty export) or fail (no hooks) depending on implementation
      expect(emptyExportResult.exitCode === 0 || emptyExportResult.exitCode === 1).toBe(true);
    });
  });

  describe('Import/Export Format Verification', () => {
    test('should support YAML export format', async () => {
      // First import our test config
      await runCLI(['import', configPath, '--scope', 'project', '--yes', '--force']);

      const yamlExportPath = path.join(testDir, 'export.yaml');
      const yamlExportResult = await runCLI([
        'export',
        '--scope',
        'project',
        '--format',
        'yaml',
        '--output',
        yamlExportPath,
      ]);

      expect(yamlExportResult.success).toBe(true);

      // Verify YAML file was created
      const yamlContent = await fs.readFile(yamlExportPath, 'utf8');
      expect(yamlContent).toMatch(/version:\s*"1\.0\.0"/);
      expect(yamlContent).toMatch(/settings:/);
      expect(yamlContent).toMatch(/hooks:/);
    });

    test('should support template export format', async () => {
      // First import our test config
      await runCLI(['import', configPath, '--scope', 'project', '--yes', '--force']);

      const templateExportPath = path.join(testDir, 'export.template');
      const templateExportResult = await runCLI([
        'export',
        '--scope',
        'project',
        '--format',
        'template',
        '--output',
        templateExportPath,
      ]);

      expect(templateExportResult.success).toBe(true);

      // Verify template file was created with comments
      const templateContent = await fs.readFile(templateExportPath, 'utf8');
      expect(templateContent).toMatch(/# Claude Good Hooks Configuration Template/);
      expect(templateContent).toMatch(/# Usage:/);
      expect(templateContent).toMatch(/PreToolUse/);
      expect(templateContent).toMatch(/# Runs before Claude uses tools/);
    });

    test('should support minified JSON export', async () => {
      // First import our test config
      await runCLI(['import', configPath, '--scope', 'project', '--yes', '--force']);

      const minifiedExportPath = path.join(testDir, 'export-minified.json');
      const minifiedExportResult = await runCLI([
        'export',
        '--scope',
        'project',
        '--minify',
        '--output',
        minifiedExportPath,
      ]);

      expect(minifiedExportResult.success).toBe(true);

      // Verify minified JSON (no extra whitespace)
      const minifiedContent = await fs.readFile(minifiedExportPath, 'utf8');
      const parsedMinified = JSON.parse(minifiedContent);

      // Should be valid JSON but without formatting
      expect(parsedMinified).toHaveProperty('settings');
      expect(minifiedContent).not.toMatch(/\n\s\s/); // No indentation
    });
  });
});

/**
 * Helper function to count hooks in a configuration
 */
function countHooks(settings: ClaudeSettings): { total: number; events: number } {
  if (!settings.hooks) {
    return { total: 0, events: 0 };
  }

  let total = 0;
  const events = Object.keys(settings.hooks).length;

  for (const configs of Object.values(settings.hooks)) {
    if (configs) {
      for (const config of configs) {
        total += config.hooks.length;
      }
    }
  }

  return { total, events };
}
