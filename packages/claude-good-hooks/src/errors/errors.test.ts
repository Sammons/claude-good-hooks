/**
 * Tests for error handling system
 */

import { describe, it, expect } from 'vitest';
import {
  CLIError,
  ValidationError,
  ConfigError,
  HookError,
  NetworkError,
  FileSystemError,
  PermissionError,
  CommandError,
  InternalError,
  isCLIError,
  hasErrorSuggestion,
  formatError,
} from './index.js';

describe('Error Classes', () => {
  describe('CLIError', () => {
    it('should create a basic CLI error', () => {
      const error = new CLIError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('CLIError');
      expect(error.exitCode).toBe(1);
      expect(error.isUserFacing).toBe(true);
      expect(error.suggestion).toBeUndefined();
    });

    it('should create a CLI error with custom options', () => {
      const error = new CLIError('Test error', {
        exitCode: 2,
        isUserFacing: false,
        suggestion: 'Try again later',
      });

      expect(error.exitCode).toBe(2);
      expect(error.isUserFacing).toBe(false);
      expect(error.suggestion).toBe('Try again later');
    });

    it('should create a CLI error with cause', () => {
      const cause = new Error('Original error');
      const error = new CLIError('Test error', { cause });

      expect(error.cause).toBe(cause);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with default settings', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error.exitCode).toBe(1);
      expect(error.isUserFacing).toBe(true);
    });

    it('should create a validation error with suggestion', () => {
      const error = new ValidationError('Invalid input', {
        suggestion: 'Check your arguments',
      });

      expect(error.suggestion).toBe('Check your arguments');
    });
  });

  describe('ConfigError', () => {
    it('should create a config error with path and key', () => {
      const error = new ConfigError('Invalid config', {
        configPath: '/path/to/config',
        configKey: 'some.key',
      });

      expect(error.configPath).toBe('/path/to/config');
      expect(error.configKey).toBe('some.key');
    });
  });

  describe('HookError', () => {
    it('should create a hook error with hook details', () => {
      const error = new HookError('Hook failed', {
        hookName: 'test-hook',
        hookPath: '/path/to/hook',
      });

      expect(error.hookName).toBe('test-hook');
      expect(error.hookPath).toBe('/path/to/hook');
    });
  });

  describe('NetworkError', () => {
    it('should create a network error with default suggestion', () => {
      const error = new NetworkError('Connection failed');

      expect(error.suggestion).toBe('Check your internet connection and try again.');
    });

    it('should create a network error with URL and status', () => {
      const error = new NetworkError('HTTP error', {
        url: 'https://example.com',
        statusCode: 404,
      });

      expect(error.url).toBe('https://example.com');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('FileSystemError', () => {
    it('should create a filesystem error with path and operation', () => {
      const error = new FileSystemError('File not found', {
        path: '/path/to/file',
        operation: 'read',
      });

      expect(error.path).toBe('/path/to/file');
      expect(error.operation).toBe('read');
    });
  });

  describe('PermissionError', () => {
    it('should create a permission error with default suggestion', () => {
      const error = new PermissionError('Access denied', {
        path: '/path/to/file',
      });

      expect(error.path).toBe('/path/to/file');
      expect(error.suggestion).toContain('Check file permissions for /path/to/file');
    });
  });

  describe('CommandError', () => {
    it('should create a command error with execution details', () => {
      const error = new CommandError('Command failed', {
        command: 'npm install',
        stdout: 'Installing...',
        stderr: 'Error occurred',
        exitCode: 1,
      });

      expect(error.command).toBe('npm install');
      expect(error.stdout).toBe('Installing...');
      expect(error.stderr).toBe('Error occurred');
      expect(error.exitCode).toBe(1);
    });
  });

  describe('InternalError', () => {
    it('should create an internal error with appropriate settings', () => {
      const error = new InternalError('Something went wrong');

      expect(error.message).toBe('Internal error: Something went wrong');
      expect(error.isUserFacing).toBe(false);
      expect(error.suggestion).toContain('bug in claude-good-hooks');
    });
  });
});

describe('Type Guards', () => {
  it('should identify CLI errors correctly', () => {
    const cliError = new CLIError('CLI error');
    const regularError = new Error('Regular error');

    expect(isCLIError(cliError)).toBe(true);
    expect(isCLIError(regularError)).toBe(false);
    expect(isCLIError('string')).toBe(false);
    expect(isCLIError(null)).toBe(false);
  });

  it('should identify errors with suggestions', () => {
    const errorWithSuggestion = new CLIError('Error', { suggestion: 'Try this' });
    const errorWithoutSuggestion = new CLIError('Error');
    const errorWithEmptySuggestion = new CLIError('Error', { suggestion: '' });

    expect(hasErrorSuggestion(errorWithSuggestion)).toBe(true);
    expect(hasErrorSuggestion(errorWithoutSuggestion)).toBe(false);
    expect(hasErrorSuggestion(errorWithEmptySuggestion)).toBe(false);
    expect(hasErrorSuggestion(new Error('Regular error'))).toBe(false);
  });
});

describe('Error Formatting', () => {
  describe('Console Output', () => {
    it('should format CLI error for console', () => {
      const error = new CLIError('Test error', {
        suggestion: 'Try again',
      });

      const formatted = formatError(error);

      expect(formatted).toContain('Error: Test error');
      expect(formatted).toContain('💡 Suggestion: Try again');
    });

    it('should format CLI error without suggestion', () => {
      const error = new CLIError('Test error');

      const formatted = formatError(error);

      expect(formatted).toBe('Error: Test error');
    });

    it('should format regular error for console', () => {
      const error = new Error('Regular error');

      const formatted = formatError(error);

      expect(formatted).toBe('Error: Regular error');
    });

    it('should format string error for console', () => {
      const formatted = formatError('String error');

      expect(formatted).toBe('Error: String error');
    });

    it('should include stack trace when requested', () => {
      const error = new CLIError('Test error');

      const formatted = formatError(error, { showStackTrace: true });

      expect(formatted).toContain('Stack trace:');
    });
  });

  describe('JSON Output', () => {
    it('should format CLI error as JSON', () => {
      const error = new CLIError('Test error', {
        exitCode: 2,
        suggestion: 'Try again',
      });

      const formatted = formatError(error, { isJson: true });
      const parsed = JSON.parse(formatted);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Test error');
      expect(parsed.errorType).toBe('CLIError');
      expect(parsed.exitCode).toBe(2);
      expect(parsed.suggestion).toBe('Try again');
    });

    it('should format regular error as JSON', () => {
      const error = new Error('Regular error');

      const formatted = formatError(error, { isJson: true });
      const parsed = JSON.parse(formatted);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Regular error');
      expect(parsed.errorType).toBe('UnknownError');
      expect(parsed.exitCode).toBe(1);
    });

    it('should include type-specific details when requested', () => {
      const error = new ConfigError('Config error', {
        configPath: '/path/to/config',
        configKey: 'some.key',
      });

      const formatted = formatError(error, {
        isJson: true,
        includeDetails: true,
      });
      const parsed = JSON.parse(formatted);

      expect(parsed.configPath).toBe('/path/to/config');
      expect(parsed.configKey).toBe('some.key');
    });

    it('should include stack trace in JSON when requested', () => {
      const error = new CLIError('Test error');

      const formatted = formatError(error, {
        isJson: true,
        showStackTrace: true,
      });
      const parsed = JSON.parse(formatted);

      expect(parsed.stack).toBeDefined();
    });
  });
});

describe('Error Inheritance', () => {
  it('should maintain proper inheritance chain', () => {
    const validationError = new ValidationError('Validation failed');

    expect(validationError instanceof ValidationError).toBe(true);
    expect(validationError instanceof CLIError).toBe(true);
    expect(validationError instanceof Error).toBe(true);
  });

  it('should have correct constructor names', () => {
    const errors = [
      new ValidationError('test'),
      new ConfigError('test'),
      new HookError('test'),
      new NetworkError('test'),
      new FileSystemError('test'),
      new PermissionError('test'),
      new CommandError('test'),
      new InternalError('test'),
    ];

    const expectedNames = [
      'ValidationError',
      'ConfigError',
      'HookError',
      'NetworkError',
      'FileSystemError',
      'PermissionError',
      'CommandError',
      'InternalError',
    ];

    errors.forEach((error, index) => {
      expect(error.name).toBe(expectedNames[index]);
    });
  });
});
