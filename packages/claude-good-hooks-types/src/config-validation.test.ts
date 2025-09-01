import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ClaudeSettings } from './index.js';
import type { VersionedClaudeSettings } from './schemas/index.js';
import { 
  validateSettings, 
  validateAndNormalizeSettings, 
  validateSettingsComprehensive,
  convertLegacySettings 
} from './validation.js';
import { 
  atomicReadFile, 
  atomicWriteSettings, 
  atomicUpdateSettings, 
  verifyFileIntegrity 
} from './atomic-operations.js';
import { 
  migrateSettings, 
  detectSettingsVersion, 
  needsMigration 
} from './migrations.js';
import { 
  createVersionedSettings, 
  getVersionInfo, 
  trackSettingsChange 
} from './version-tracking.js';

/**
 * Configuration Validation and Management Test Suite
 */

describe('Configuration Validation and Management', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    tempDir = tmpdir();
    testFilePath = join(tempDir, `test-settings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
  });

  afterEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
    // Clean up any backup files
    const dir = require('fs').readdirSync(tempDir);
    const testFileName = require('path').basename(testFilePath);
    dir.forEach((file: string) => {
      if (file.startsWith(`${testFileName}.backup.`)) {
        try {
          unlinkSync(join(tempDir, file));
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('JSON Schema Validation', () => {
    it('should validate valid versioned settings', () => {
      const validSettings: VersionedClaudeSettings = {
        $schema: 'https://github.com/sammons/claude-good-hooks/schemas/claude-settings.json',
        version: '1.0.0',
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              description: 'Format code after writing',
              hooks: [
                {
                  type: 'command',
                  command: 'prettier --write .',
                  timeout: 30000,
                  description: 'Format with Prettier'
                }
              ]
            }
          ]
        },
        meta: {
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
          source: 'project'
        }
      };

      const result = validateSettings(validSettings);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid settings structure', () => {
      const invalidSettings = {
        hooks: {
          InvalidEvent: [
            {
              hooks: [
                {
                  type: 'invalid-type',
                  command: 'echo test'
                }
              ]
            }
          ]
        }
      };

      const result = validateSettings(invalidSettings);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate and normalize settings with defaults', () => {
      const basicSettings = {
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'echo test'
                }
              ]
            }
          ]
        }
      };

      const result = validateAndNormalizeSettings(basicSettings, 'project');
      expect(result.valid).toBe(true);
      expect(result.settings).toBeDefined();
      expect(result.settings!.$schema).toBe('https://github.com/sammons/claude-good-hooks/schemas/claude-settings.json');
      expect(result.settings!.version).toBe('1.0.0');
      expect(result.settings!.meta?.source).toBe('project');
      expect(result.settings!.meta?.createdAt).toBeDefined();
      expect(result.settings!.meta?.updatedAt).toBeDefined();
    });
  });

  describe('Custom Validation Rules', () => {
    it('should detect potentially dangerous commands', () => {
      const dangerousSettings: VersionedClaudeSettings = {
        version: '1.0.0',
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'rm -rf /',
                  description: 'Dangerous command'
                }
              ]
            }
          ]
        }
      };

      const result = validateSettingsComprehensive(dangerousSettings);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('potentially dangerous'))).toBe(true);
    });

    it('should validate timeout ranges', () => {
      const invalidTimeoutSettings: VersionedClaudeSettings = {
        version: '1.0.0',
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'echo test',
                  timeout: -1000 // Negative timeout
                }
              ]
            }
          ]
        }
      };

      const result = validateSettingsComprehensive(invalidTimeoutSettings);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('cannot be negative'))).toBe(true);
    });

    it('should validate regex matchers', () => {
      const invalidRegexSettings: VersionedClaudeSettings = {
        version: '1.0.0',
        hooks: {
          PreToolUse: [
            {
              matcher: '[invalid regex', // Invalid regex
              hooks: [
                {
                  type: 'command',
                  command: 'echo test'
                }
              ]
            }
          ]
        }
      };

      const result = validateSettingsComprehensive(invalidRegexSettings);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid regex pattern'))).toBe(true);
    });
  });

  describe('Atomic File Operations', () => {
    it('should atomically read and write settings', async () => {
      const settings: VersionedClaudeSettings = createVersionedSettings('project');
      settings.hooks!.PostToolUse = [
        {
          hooks: [
            {
              type: 'command',
              command: 'echo "test"'
            }
          ]
        }
      ];

      // Write settings
      const writeResult = atomicWriteSettings(testFilePath, settings);
      expect(writeResult.success).toBe(true);
      expect(existsSync(testFilePath)).toBe(true);

      // Read settings back
      const readResult = atomicReadFile(testFilePath);
      expect(readResult.success).toBe(true);
      const parsed = JSON.parse(readResult.content!);
      expect(parsed.hooks.PostToolUse).toHaveLength(1);
    });

    it('should create backups when writing', () => {
      const initialSettings = createVersionedSettings('project');
      
      // Write initial settings
      atomicWriteSettings(testFilePath, initialSettings);
      
      // Update settings (should create backup)
      const updatedSettings = { ...initialSettings };
      updatedSettings.hooks!.SessionStart = [
        {
          hooks: [{ type: 'command', command: 'git status' }]
        }
      ];
      
      const writeResult = atomicWriteSettings(testFilePath, updatedSettings, { backup: true });
      expect(writeResult.success).toBe(true);
      expect(writeResult.backupPath).toBeDefined();
      expect(existsSync(writeResult.backupPath!)).toBe(true);
    });

    it('should validate before writing', () => {
      const invalidSettings = {
        hooks: {
          InvalidEvent: 'not an array'
        }
      };

      const writeResult = atomicWriteSettings(testFilePath, invalidSettings as any, {
        validateBeforeWrite: true
      });
      
      expect(writeResult.success).toBe(false);
      expect(writeResult.validationErrors).toBeDefined();
      expect(writeResult.validationErrors!.length).toBeGreaterThan(0);
      expect(existsSync(testFilePath)).toBe(false);
    });

    it('should atomically update settings', () => {
      const initialSettings = createVersionedSettings('project');
      atomicWriteSettings(testFilePath, initialSettings);

      const updateResult = atomicUpdateSettings(testFilePath, (settings) => {
        if (!settings.hooks) settings.hooks = {};
        settings.hooks.PreToolUse = [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'validate-command.sh' }]
          }
        ];
        return settings;
      });

      expect(updateResult.success).toBe(true);

      // Verify the update
      const readResult = atomicReadFile(testFilePath);
      const updated = JSON.parse(readResult.content!);
      expect(updated.hooks.PreToolUse).toHaveLength(1);
      expect(updated.hooks.PreToolUse[0].matcher).toBe('Bash');
    });

    it('should verify file integrity', () => {
      const settings = createVersionedSettings('project');
      atomicWriteSettings(testFilePath, settings);

      const integrityResult = verifyFileIntegrity(testFilePath);
      expect(integrityResult.valid).toBe(true);
      expect(integrityResult.settings).toBeDefined();

      // Corrupt the file
      writeFileSync(testFilePath, 'invalid json{', 'utf-8');
      
      const corruptIntegrityResult = verifyFileIntegrity(testFilePath);
      expect(corruptIntegrityResult.valid).toBe(false);
      expect(corruptIntegrityResult.error).toBeDefined();
    });
  });

  describe('Migration System', () => {
    it('should detect settings versions', () => {
      const legacySettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              hooks: [{ type: 'command', command: 'prettier --write .' }]
            }
          ]
        }
      };

      expect(detectSettingsVersion(legacySettings)).toBe('0.0.0');

      const versionedSettings: VersionedClaudeSettings = {
        version: '1.0.0',
        hooks: {}
      };

      expect(detectSettingsVersion(versionedSettings)).toBe('1.0.0');
    });

    it('should identify when migration is needed', () => {
      const legacySettings: ClaudeSettings = {
        hooks: {
          PostToolUse: []
        }
      };

      expect(needsMigration(legacySettings)).toBe(true);

      const currentSettings: VersionedClaudeSettings = {
        version: '1.0.0',
        hooks: {}
      };

      expect(needsMigration(currentSettings)).toBe(false);
    });

    it('should migrate legacy settings to current version', () => {
      const legacySettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write|Edit',
              hooks: [
                {
                  type: 'command',
                  command: 'prettier --write .',
                  timeout: 30000
                }
              ]
            }
          ],
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'git status'
                }
              ]
            }
          ]
        }
      };

      const migrationResult = migrateSettings(legacySettings, '1.0.0', 'project');
      
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.migratedSettings).toBeDefined();
      expect(migrationResult.appliedMigrations).toContain('1.0.0');
      
      const migrated = migrationResult.migratedSettings!;
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.$schema).toBeDefined();
      expect(migrated.meta?.source).toBe('project');
      expect(migrated.meta?.migrations).toBeDefined();
      expect(migrated.meta!.migrations!.length).toBeGreaterThan(0);
      
      // Verify hooks were preserved
      expect(migrated.hooks?.PostToolUse).toHaveLength(1);
      expect(migrated.hooks?.SessionStart).toHaveLength(1);
    });

    it('should convert legacy settings directly', () => {
      const legacySettings: ClaudeSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'validate.sh' }]
            }
          ]
        }
      };

      const converted = convertLegacySettings(legacySettings, 'global');
      
      expect(converted.version).toBe('1.0.0');
      expect(converted.meta?.source).toBe('global');
      expect(converted.hooks?.PreToolUse).toHaveLength(1);
      expect(converted.hooks?.PreToolUse![0].matcher).toBe('Bash');
    });
  });

  describe('Version Tracking', () => {
    it('should create properly versioned settings', () => {
      const settings = createVersionedSettings('local');
      
      expect(settings.version).toBe('1.0.0');
      expect(settings.$schema).toBeDefined();
      expect(settings.meta?.source).toBe('local');
      expect(settings.meta?.createdAt).toBeDefined();
      expect(settings.meta?.updatedAt).toBeDefined();
      expect(settings.meta?.migrations).toEqual([]);
      expect(settings.hooks).toEqual({});
    });

    it('should get version information', () => {
      const legacySettings: ClaudeSettings = { hooks: {} };
      const versionInfo = getVersionInfo(legacySettings);
      
      expect(versionInfo.current).toBe('0.0.0');
      expect(versionInfo.latest).toBe('1.0.0');
      expect(versionInfo.needsUpdate).toBe(true);
      expect(versionInfo.migrationAvailable).toBe(true);
    });

    it('should track settings changes', () => {
      const settings = createVersionedSettings('project');
      const tracked = trackSettingsChange(
        settings,
        'update',
        'Added new hook configuration',
        ['PostToolUse'],
        { hookCount: 1 }
      );

      expect(tracked.meta?.updatedAt).not.toBe(settings.meta?.updatedAt);
      expect((tracked.meta as any)?.changes).toHaveLength(1);
      expect((tracked.meta as any)?.changes[0].changeType).toBe('update');
      expect((tracked.meta as any)?.changes[0].description).toBe('Added new hook configuration');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow: read legacy -> migrate -> write -> verify', () => {
      // 1. Create legacy settings file
      const legacySettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write|Edit',
              hooks: [
                {
                  type: 'command',
                  command: 'prettier --write $CLAUDE_PROJECT_DIR',
                  timeout: 30000
                },
                {
                  type: 'command',
                  command: 'eslint --fix $CLAUDE_PROJECT_DIR'
                }
              ]
            }
          ]
        }
      };

      writeFileSync(testFilePath, JSON.stringify(legacySettings, null, 2));

      // 2. Read and migrate
      const readResult = atomicReadFile(testFilePath);
      expect(readResult.success).toBe(true);

      const parsed = JSON.parse(readResult.content!);
      expect(needsMigration(parsed)).toBe(true);

      const migrationResult = migrateSettings(parsed, '1.0.0', 'project');
      expect(migrationResult.success).toBe(true);

      // 3. Write migrated settings
      const writeResult = atomicWriteSettings(testFilePath, migrationResult.migratedSettings!);
      expect(writeResult.success).toBe(true);

      // 4. Verify final settings
      const verifyResult = verifyFileIntegrity(testFilePath);
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.settings!.version).toBe('1.0.0');
      expect(verifyResult.settings!.hooks?.PostToolUse).toHaveLength(1);
      expect(verifyResult.settings!.meta?.migrations).toHaveLength(1);
    });

    it('should handle validation failure and rollback', () => {
      // Create valid settings
      const validSettings = createVersionedSettings('project');
      const writeResult = atomicWriteSettings(testFilePath, validSettings, { backup: true });
      expect(writeResult.success).toBe(true);

      // Try to update with invalid settings
      const updateResult = atomicUpdateSettings(testFilePath, (settings) => {
        // Introduce invalid configuration
        (settings as any).hooks = {
          InvalidEvent: 'not an array'
        };
        return settings;
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.validationErrors).toBeDefined();

      // Verify original file is unchanged
      const verifyResult = verifyFileIntegrity(testFilePath);
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.settings!.hooks).toEqual({});
    });

    it('should maintain consistency across multiple operations', () => {
      let settings = createVersionedSettings('project');
      
      // Write initial settings
      let result = atomicWriteSettings(testFilePath, settings);
      expect(result.success).toBe(true);

      // Add multiple hook configurations
      const updates = [
        { event: 'PreToolUse' as const, matcher: 'Bash', command: 'validate.sh' },
        { event: 'PostToolUse' as const, matcher: 'Write', command: 'format.sh' },
        { event: 'SessionStart' as const, matcher: undefined, command: 'init.sh' }
      ];

      for (const update of updates) {
        result = atomicUpdateSettings(testFilePath, (s) => {
          if (!s.hooks) s.hooks = {};
          if (!s.hooks[update.event]) s.hooks[update.event] = [];
          
          s.hooks[update.event]!.push({
            matcher: update.matcher,
            hooks: [{
              type: 'command',
              command: update.command
            }]
          });
          
          return trackSettingsChange(s, 'update', `Added ${update.event} hook`, [update.event]);
        });
        
        expect(result.success).toBe(true);
      }

      // Verify final state
      const verifyResult = verifyFileIntegrity(testFilePath);
      expect(verifyResult.valid).toBe(true);
      
      const final = verifyResult.settings!;
      expect(final.hooks?.PreToolUse).toHaveLength(1);
      expect(final.hooks?.PostToolUse).toHaveLength(1);
      expect(final.hooks?.SessionStart).toHaveLength(1);
      expect((final.meta as any)?.changes).toHaveLength(3);
    });
  });
});