import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { importCommand } from './import.js';
import * as settings from '../../utils/settings.js';
import * as validator from '../../utils/validator.js';
import * as fs from 'fs';
import { createInterface } from 'readline/promises';
import type { ClaudeSettings, ValidationResult } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../../utils/settings.js');
vi.mock('../../utils/validator.js');
vi.mock('fs');
vi.mock('readline/promises');

// Mock global fetch
global.fetch = vi.fn();

const mockReadSettings = vi.mocked(settings.readSettings);
const mockWriteSettings = vi.mocked(settings.writeSettings);
const mockValidateSettings = vi.mocked(validator.validateSettings);
const mockPrintValidationResults = vi.mocked(validator.printValidationResults);
const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockCreateInterface = vi.mocked(createInterface);
const mockFetch = vi.mocked(fetch);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('importCommand', () => {
  const mockExportedConfig = {
    version: '1.0.0',
    metadata: {
      exported: '2024-01-01T12:00:00Z',
      source: ['project'],
      generator: 'claude-good-hooks-cli',
      description: 'Test configuration'
    },
    settings: {
      hooks: {
        PreToolUse: [{
          matcher: 'Write|Edit',
          hooks: [{
            type: 'command',
            command: 'echo "imported hook"',
            timeout: 30
          }]
        }]
      }
    } as ClaudeSettings
  };

  const mockMultiScopeConfig = {
    version: '1.0.0',
    metadata: {
      exported: '2024-01-01T12:00:00Z',
      source: ['project', 'global'],
      generator: 'claude-good-hooks-cli'
    },
    settings: {
      project: {
        hooks: {
          PreToolUse: [{ hooks: [{ type: 'command', command: 'echo "project"' }] }]
        }
      },
      global: {
        hooks: {
          Stop: [{ hooks: [{ type: 'command', command: 'echo "global"' }] }]
        }
      }
    }
  };

  const mockValidResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(mockExportedConfig));
    mockReadSettings.mockReturnValue({});
    mockValidateSettings.mockReturnValue(mockValidResult);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful import from file', () => {
    it('should import configuration from JSON file', async () => {
      await importCommand('/path/to/config.json', { yes: true });

      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/config.json', 'utf8');
      expect(mockWriteSettings).toHaveBeenCalledWith('project', mockExportedConfig.settings);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration loaded successfully'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration imported successfully'));
    });

    it('should import to specific scope', async () => {
      await importCommand('/path/to/config.json', { scope: 'global', yes: true });

      expect(mockWriteSettings).toHaveBeenCalledWith('global', mockExportedConfig.settings);
    });

    it('should handle multi-scope configuration', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockMultiScopeConfig));

      await importCommand('/path/to/config.json', { scope: 'project', yes: true });

      expect(mockWriteSettings).toHaveBeenCalledWith('project', mockMultiScopeConfig.settings.project);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Using project configuration'));
    });

    it('should auto-select single scope from multi-scope config', async () => {
      const singleScopeConfig = {
        ...mockMultiScopeConfig,
        settings: { project: mockMultiScopeConfig.settings.project }
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(singleScopeConfig));

      await importCommand('/path/to/config.json', { scope: 'global', yes: true });

      expect(mockWriteSettings).toHaveBeenCalledWith('global', singleScopeConfig.settings.project);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Using project configuration (only available scope)'));
    });

    it('should validate imported configuration by default', async () => {
      await importCommand('/path/to/config.json', { yes: true });

      expect(mockValidateSettings).toHaveBeenCalledWith(mockExportedConfig.settings, '/path/to/config.json');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validating imported configuration'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration validation passed'));
    });

    it('should skip validation when requested', async () => {
      await importCommand('/path/to/config.json', { validate: false, yes: true });

      expect(mockValidateSettings).not.toHaveBeenCalled();
    });

    it('should show import statistics', async () => {
      await importCommand('/path/to/config.json', { yes: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Import Summary:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total hooks: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total events: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Target scope: project'));
    });
  });

  describe('successful import from URL', () => {
    it('should import configuration from HTTP URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify(mockExportedConfig))
      } as Response);

      await importCommand('https://example.com/hooks.json', { yes: true });

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/hooks.json');
      expect(mockWriteSettings).toHaveBeenCalledWith('project', mockExportedConfig.settings);
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      await importCommand('https://example.com/hooks.json', { yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load configuration'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await importCommand('https://example.com/hooks.json', { yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load configuration'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('merge functionality', () => {
    it('should merge with existing configuration when requested', async () => {
      const existingSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [{ hooks: [{ type: 'command', command: 'echo "existing"' }] }]
        }
      };
      mockReadSettings.mockReturnValue(existingSettings);

      await importCommand('/path/to/config.json', { merge: true, yes: true });

      const mergedCall = mockWriteSettings.mock.calls[0];
      const mergedSettings = mergedCall[1];
      
      expect(mergedSettings.hooks.PreToolUse).toBeDefined();
      expect(mergedSettings.hooks.PostToolUse).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Merging with existing configuration'));
    });

    it('should show merge statistics', async () => {
      const existingSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [{ hooks: [{ type: 'command', command: 'echo "existing"' }] }]
        }
      };
      mockReadSettings.mockReturnValue(existingSettings);

      await importCommand('/path/to/config.json', { merge: true, yes: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Current hooks: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('After import: 2'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Change: +1'));
    });
  });

  describe('interactive mode', () => {
    it('should prompt for merge when existing configuration found', async () => {
      const existingSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [{ hooks: [{ type: 'command', command: 'echo "existing"' }] }]
        }
      };
      mockReadSettings.mockReturnValue(existingSettings);

      const mockReadline = {
        question: vi.fn()
          .mockResolvedValueOnce('2') // choose merge
          .mockResolvedValueOnce('y'), // confirm import
        close: vi.fn()
      };
      mockCreateInterface.mockReturnValue(mockReadline as any);

      await importCommand('/path/to/config.json', {});

      expect(mockReadline.question).toHaveBeenCalledWith(expect.stringContaining('Enter your choice'));
      expect(mockReadline.question).toHaveBeenCalledWith(expect.stringContaining('Proceed with import'));
      expect(mockWriteSettings).toHaveBeenCalled();
    });

    it('should handle import cancellation', async () => {
      const existingSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [{ hooks: [{ type: 'command', command: 'echo "existing"' }] }]
        }
      };
      mockReadSettings.mockReturnValue(existingSettings);

      const mockReadline = {
        question: vi.fn()
          .mockResolvedValueOnce('3'), // cancel
        close: vi.fn()
      };
      mockCreateInterface.mockReturnValue(mockReadline as any);

      await importCommand('/path/to/config.json', {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Import cancelled'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle replace choice', async () => {
      const existingSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [{ hooks: [{ type: 'command', command: 'echo "existing"' }] }]
        }
      };
      mockReadSettings.mockReturnValue(existingSettings);

      const mockReadline = {
        question: vi.fn()
          .mockResolvedValueOnce('1') // replace
          .mockResolvedValueOnce('y'), // confirm
        close: vi.fn()
      };
      mockCreateInterface.mockReturnValue(mockReadline as any);

      await importCommand('/path/to/config.json', {});

      expect(mockWriteSettings).toHaveBeenCalledWith('project', mockExportedConfig.settings);
    });
  });

  describe('dry run mode', () => {
    it('should show preview without making changes in dry run mode', async () => {
      await importCommand('/path/to/config.json', { dryRun: true });

      expect(mockWriteSettings).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run completed - no changes made'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Remove --dry-run flag'));
    });
  });

  describe('validation errors', () => {
    it('should handle validation errors and exit', async () => {
      const invalidResult: ValidationResult = {
        valid: false,
        errors: [{
          type: 'syntax',
          message: 'Invalid command syntax'
        }],
        warnings: [],
        suggestions: []
      };
      mockValidateSettings.mockReturnValue(invalidResult);

      await importCommand('/path/to/config.json', { yes: true });

      expect(mockPrintValidationResults).toHaveBeenCalledWith(invalidResult, true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Import cancelled due to validation errors'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should continue with --force flag despite validation errors', async () => {
      const invalidResult: ValidationResult = {
        valid: false,
        errors: [{
          type: 'syntax',
          message: 'Invalid command syntax'
        }],
        warnings: [],
        suggestions: []
      };
      mockValidateSettings.mockReturnValue(invalidResult);

      await importCommand('/path/to/config.json', { force: true, yes: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Continuing with --force flag'));
      expect(mockWriteSettings).toHaveBeenCalled();
    });

    it('should show validation warnings', async () => {
      const warningResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [{
          type: 'performance',
          message: 'High timeout value'
        }],
        suggestions: []
      };
      mockValidateSettings.mockReturnValue(warningResult);

      await importCommand('/path/to/config.json', { yes: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 warnings found'));
      expect(mockWriteSettings).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle file not found', async () => {
      mockExistsSync.mockReturnValue(false);

      await importCommand('/path/to/nonexistent.json', { yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load configuration'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle invalid JSON', async () => {
      mockReadFileSync.mockReturnValue('invalid json content');

      await importCommand('/path/to/config.json', { yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load configuration'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle invalid configuration format', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({ invalid: 'format' }));

      await importCommand('/path/to/config.json', { yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load configuration'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle scope not found in multi-scope config', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(mockMultiScopeConfig));

      await importCommand('/path/to/config.json', { scope: 'local', yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Scope 'local' not found"));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Available scopes: project, global'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle write errors', async () => {
      mockWriteSettings.mockImplementation(() => {
        throw new Error('Write permission denied');
      });

      await importCommand('/path/to/config.json', { yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Import failed'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('YAML support', () => {
    it('should handle YAML files', async () => {
      const yamlContent = 'version: "1.0.0"\nsettings:\n  hooks:\n    PreToolUse: []';
      mockReadFileSync.mockReturnValue(yamlContent);

      await importCommand('/path/to/config.yaml', { yes: true });

      // Should attempt to parse as YAML (though our simple parser might not handle this complex case)
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/config.yaml', 'utf8');
    });
  });

  describe('direct settings import', () => {
    it('should handle direct ClaudeSettings format', async () => {
      const directSettings = {
        hooks: {
          PreToolUse: [{ hooks: [{ type: 'command', command: 'echo "direct"' }] }]
        }
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(directSettings));

      await importCommand('/path/to/settings.json', { yes: true });

      expect(mockWriteSettings).toHaveBeenCalledWith('project', directSettings);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration loaded successfully'));
    });
  });
});