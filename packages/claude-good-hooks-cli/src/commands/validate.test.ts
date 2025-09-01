import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { validateCommand } from './validate.js';
import * as settings from '../utils/settings.js';
import * as validator from '../utils/validator.js';
import * as fs from 'fs';
import type { ClaudeSettings, ValidationResult } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../utils/settings.js');
vi.mock('../utils/validator.js');
vi.mock('fs');

const mockReadSettings = vi.mocked(settings.readSettings);
const mockGetSettingsPath = vi.mocked(settings.getSettingsPath);
const mockValidateSettings = vi.mocked(validator.validateSettings);
const mockTestCommand = vi.mocked(validator.testCommand);
const mockValidateCommandPaths = vi.mocked(validator.validateCommandPaths);
const mockPrintValidationResults = vi.mocked(validator.printValidationResults);
const mockExistsSync = vi.mocked(fs.existsSync);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('validateCommand', () => {
  const mockValidSettings: ClaudeSettings = {
    hooks: {
      PreToolUse: [{
        matcher: 'Write|Edit',
        hooks: [{
          type: 'command',
          command: 'echo "test"',
          timeout: 30
        }]
      }],
      PostToolUse: [{
        matcher: '*',
        hooks: [{
          type: 'command',
          command: 'git status',
          timeout: 10
        }]
      }]
    }
  };

  const mockValidResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  const mockInvalidResult: ValidationResult = {
    valid: false,
    errors: [{
      type: 'syntax',
      message: 'Invalid command syntax',
      location: 'project:PreToolUse[0]'
    }],
    warnings: [{
      type: 'security',
      message: 'Potentially dangerous command',
      location: 'project:PostToolUse[0]',
      suggestion: 'Review command for security implications'
    }],
    suggestions: ['Consider using safer alternatives']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettingsPath.mockImplementation((scope) => `/test/.claude/settings${scope === 'local' ? '.local' : ''}.json`);
    mockExistsSync.mockReturnValue(true);
    mockReadSettings.mockReturnValue(mockValidSettings);
    mockValidateSettings.mockReturnValue(mockValidResult);
    mockTestCommand.mockResolvedValue(mockValidResult);
    mockValidateCommandPaths.mockReturnValue(mockValidResult);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful validation', () => {
    it('should validate all scopes by default', async () => {
      await validateCommand({});

      expect(mockGetSettingsPath).toHaveBeenCalledWith('global');
      expect(mockGetSettingsPath).toHaveBeenCalledWith('project');
      expect(mockGetSettingsPath).toHaveBeenCalledWith('local');
      expect(mockReadSettings).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All validations passed'));
    });

    it('should validate specific scope when provided', async () => {
      await validateCommand({ scope: 'project' });

      expect(mockGetSettingsPath).toHaveBeenCalledWith('project');
      expect(mockReadSettings).toHaveBeenCalledTimes(1);
      expect(mockValidateSettings).toHaveBeenCalledWith(mockValidSettings, expect.any(String));
    });

    it('should validate global scope', async () => {
      await validateCommand({ scope: 'global' });

      expect(mockGetSettingsPath).toHaveBeenCalledWith('global');
      expect(mockReadSettings).toHaveBeenCalledTimes(1);
    });

    it('should validate local scope', async () => {
      await validateCommand({ scope: 'local' });

      expect(mockGetSettingsPath).toHaveBeenCalledWith('local');
      expect(mockReadSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle missing settings files gracefully', async () => {
      mockExistsSync.mockReturnValue(false);

      await validateCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No project settings file found'));
    });

    it('should show validation summary', async () => {
      await validateCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validation Summary'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ PASS'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total: '));
    });
  });

  describe('validation with command testing', () => {
    it('should test command syntax when --test-commands is enabled', async () => {
      await validateCommand({ scope: 'project', testCommands: true });

      expect(mockTestCommand).toHaveBeenCalledWith('echo "test"', 30);
      expect(mockTestCommand).toHaveBeenCalledWith('git status', 10);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Testing command syntax'));
    });

    it('should validate file paths when --check-paths is enabled', async () => {
      await validateCommand({ scope: 'project', checkPaths: true });

      expect(mockValidateCommandPaths).toHaveBeenCalledWith('echo "test"');
      expect(mockValidateCommandPaths).toHaveBeenCalledWith('git status');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Checking command paths'));
    });

    it('should handle command test failures', async () => {
      const testFailResult: ValidationResult = {
        valid: false,
        errors: [{
          type: 'syntax',
          message: 'Command syntax error',
          details: 'Invalid bash syntax'
        }],
        warnings: [],
        suggestions: []
      };
      mockTestCommand.mockResolvedValue(testFailResult);

      await validateCommand({ scope: 'project', testCommands: true });

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('validation failures', () => {
    it('should handle validation errors and exit with code 1', async () => {
      mockValidateSettings.mockReturnValue(mockInvalidResult);

      await validateCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌ FAIL'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should show detailed error information in verbose mode', async () => {
      mockValidateSettings.mockReturnValue(mockInvalidResult);

      await validateCommand({ scope: 'project', verbose: true });

      expect(mockPrintValidationResults).toHaveBeenCalledWith(
        expect.objectContaining({ valid: false }),
        true
      );
    });

    it('should show fix recommendations when validation fails', async () => {
      mockValidateSettings.mockReturnValue(mockInvalidResult);

      await validateCommand({ scope: 'project', fix: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Auto-fix not implemented yet'));
    });
  });

  describe('validation with warnings', () => {
    it('should pass validation but show warnings', async () => {
      const warningResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [{
          type: 'performance',
          message: 'High timeout value',
          location: 'project:PreToolUse[0]',
          suggestion: 'Consider reducing timeout'
        }],
        suggestions: []
      };
      mockValidateSettings.mockReturnValue(warningResult);

      await validateCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All validations passed'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('There are warnings'));
    });
  });

  describe('recommendations', () => {
    it('should provide security recommendations for security warnings', async () => {
      const securityWarningResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [{
          type: 'security',
          message: 'Dangerous command detected',
          location: 'project:PostToolUse[0]'
        }],
        suggestions: []
      };
      mockValidateSettings.mockReturnValue(securityWarningResult);

      await validateCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔒 Security:'));
    });

    it('should provide performance recommendations for performance warnings', async () => {
      const performanceWarningResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [{
          type: 'performance',
          message: 'High timeout value',
          location: 'project:PostToolUse[0]'
        }],
        suggestions: []
      };
      mockValidateSettings.mockReturnValue(performanceWarningResult);

      await validateCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚡ Performance:'));
    });

    it('should provide best practice recommendations', async () => {
      const bestPracticeWarningResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [{
          type: 'best-practice',
          message: 'Missing shebang',
          location: 'project:PostToolUse[0]'
        }],
        suggestions: []
      };
      mockValidateSettings.mockReturnValue(bestPracticeWarningResult);

      await validateCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📋 Best Practices:'));
    });

    it('should provide compatibility recommendations', async () => {
      const compatibilityWarningResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [{
          type: 'compatibility',
          message: 'File not found',
          location: 'project:PostToolUse[0]'
        }],
        suggestions: []
      };
      mockValidateSettings.mockReturnValue(compatibilityWarningResult);

      await validateCommand({ scope: 'project' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔄 Compatibility:'));
    });

    it('should show suggestions in verbose mode', async () => {
      const suggestionResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: ['Use descriptive variable names', 'Add error handling']
      };
      mockValidateSettings.mockReturnValue(suggestionResult);

      await validateCommand({ scope: 'project', verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('💭 Additional Suggestions:'));
    });
  });

  describe('error handling', () => {
    it('should handle command test timeouts', async () => {
      mockTestCommand.mockRejectedValue(new Error('Command test timeout'));

      await validateCommand({ scope: 'project', testCommands: true });

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle invalid settings structure', async () => {
      mockReadSettings.mockReturnValue({} as ClaudeSettings);
      
      const invalidResult: ValidationResult = {
        valid: false,
        errors: [{
          type: 'structure',
          message: 'Invalid settings structure'
        }],
        warnings: [],
        suggestions: []
      };
      mockValidateSettings.mockReturnValue(invalidResult);

      await validateCommand({ scope: 'project' });

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});