/**
 * Tests for error handling system
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  ERROR_CODES,
  isAppError,
  formatError,
  // Test the deprecated aliases still work
  CLIError,
  ValidationError,
  ConfigError,
  HookError,
  NetworkError,
  FileSystemError,
  PermissionError,
  CommandError,
  InternalError,
} from './index.js';

describe('AppError', () => {
  describe('Basic functionality', () => {
    it('should create a basic error with default code', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.code).toBe(ERROR_CODES.UNKNOWN);
      expect(error.exitCode).toBe(1);
      expect(error.isUserFacing).toBe(true);
      expect(error.suggestion).toBeUndefined();
    });

    it('should create an error with specific code', () => {
      const error = new AppError('Validation failed', {
        code: ERROR_CODES.VALIDATION_FAILED,
      });

      expect(error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
      expect(error.exitCode).toBe(2); // Validation errors use exit code 2
    });

    it('should create an error with all options', () => {
      const cause = new Error('Original error');
      const error = new AppError('Test error', {
        code: ERROR_CODES.CONFIG_INVALID,
        exitCode: 3,
        isUserFacing: false,
        suggestion: 'Try again later',
        cause,
        context: {
          configPath: '/path/to/config',
          configKey: 'test.key',
        },
      });

      expect(error.code).toBe(ERROR_CODES.CONFIG_INVALID);
      expect(error.exitCode).toBe(3);
      expect(error.isUserFacing).toBe(false);
      expect(error.suggestion).toBe('Try again later');
      expect(error.cause).toBe(cause);
      expect(error.context?.configPath).toBe('/path/to/config');
      expect(error.context?.configKey).toBe('test.key');
    });
  });

  describe('Factory methods', () => {
    it('should create validation error', () => {
      const error = AppError.validation('Invalid input', {
        suggestion: 'Check your input',
      });

      expect(error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
      expect(error.exitCode).toBe(2); // Validation errors use exit code 2
      expect(error.suggestion).toBe('Check your input');
    });

    it('should create config error', () => {
      const error = AppError.config('Invalid config', {
        configPath: '/path/to/config',
        configKey: 'test.key',
      });

      expect(error.code).toBe(ERROR_CODES.CONFIG_INVALID);
      expect(error.exitCode).toBe(3); // Config errors use exit code 3
      expect(error.context?.configPath).toBe('/path/to/config');
      expect(error.context?.configKey).toBe('test.key');
    });

    it('should create hook error', () => {
      const error = AppError.hook('Hook failed', {
        hookName: 'test-hook',
        hookPath: '/path/to/hook',
      });

      expect(error.code).toBe(ERROR_CODES.HOOK_EXECUTION_FAILED);
      expect(error.exitCode).toBe(4); // Hook errors use exit code 4
      expect(error.context?.hookName).toBe('test-hook');
      expect(error.context?.hookPath).toBe('/path/to/hook');
    });

    it('should create network error with default suggestion', () => {
      const error = AppError.network('Connection failed');

      expect(error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
      expect(error.exitCode).toBe(9); // Network errors use exit code 9
      expect(error.suggestion).toBe('Check your internet connection and try again.');
    });

    it('should create filesystem error', () => {
      const error = AppError.filesystem('File not found', {
        path: '/path/to/file',
        operation: 'read',
      });

      expect(error.code).toBe(ERROR_CODES.FILESYSTEM_OPERATION_FAILED);
      expect(error.exitCode).toBe(6); // Filesystem errors use exit code 6
      expect(error.context?.path).toBe('/path/to/file');
      expect(error.context?.operation).toBe('read');
    });

    it('should create permission error with auto suggestion', () => {
      const error = AppError.permission('Access denied', {
        path: '/path/to/file',
      });

      expect(error.code).toBe(ERROR_CODES.PERMISSION_DENIED);
      expect(error.exitCode).toBe(7); // Permission errors use exit code 7
      expect(error.context?.path).toBe('/path/to/file');
      expect(error.suggestion).toContain('Check file permissions for /path/to/file');
    });

    it('should create command error', () => {
      const error = AppError.command('Command failed', {
        command: 'npm install',
        stdout: 'Installing...',
        stderr: 'Error occurred',
      });

      expect(error.code).toBe(ERROR_CODES.COMMAND_EXECUTION_FAILED);
      expect(error.exitCode).toBe(8); // Command errors use exit code 8
      expect(error.context?.command).toBe('npm install');
      expect(error.context?.stdout).toBe('Installing...');
      expect(error.context?.stderr).toBe('Error occurred');
    });

    it('should create internal error', () => {
      const error = AppError.internal('Something went wrong');

      expect(error.code).toBe(ERROR_CODES.INTERNAL);
      expect(error.exitCode).toBe(99);
      expect(error.isUserFacing).toBe(false);
      expect(error.suggestion).toContain('bug in claude-good-hooks');
    });
  });

  describe('Error code to exit code mapping', () => {
    it('should map error codes to exit codes correctly', () => {
      const testCases = [
        { code: ERROR_CODES.VALIDATION_FAILED, expectedExit: 2 },
        { code: ERROR_CODES.CONFIG_INVALID, expectedExit: 3 },
        { code: ERROR_CODES.HOOK_EXECUTION_FAILED, expectedExit: 4 },
        { code: ERROR_CODES.NETWORK_REQUEST_FAILED, expectedExit: 9 },
        { code: ERROR_CODES.FILESYSTEM_OPERATION_FAILED, expectedExit: 6 },
        { code: ERROR_CODES.PERMISSION_DENIED, expectedExit: 7 },
        { code: ERROR_CODES.COMMAND_EXECUTION_FAILED, expectedExit: 8 },
        { code: ERROR_CODES.MODULE_NOT_FOUND, expectedExit: 5 },
        { code: ERROR_CODES.TIMEOUT, expectedExit: 10 },
        { code: ERROR_CODES.INTERNAL, expectedExit: 99 },
        { code: ERROR_CODES.UNKNOWN, expectedExit: 1 },
      ];

      testCases.forEach(({ code, expectedExit }) => {
        const error = new AppError('Test', { code });
        expect(error.exitCode).toBe(expectedExit);
      });
    });
  });
});

describe('Deprecated error classes (backward compatibility)', () => {
  it('should still support ValidationError', () => {
    const error = new ValidationError('Invalid input', {
      suggestion: 'Check your arguments',
    });

    expect(error instanceof AppError).toBe(true);
    expect(error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(error.suggestion).toBe('Check your arguments');
  });

  it('should still support ConfigError', () => {
    const error = new ConfigError('Invalid config', {
      configPath: '/path/to/config',
      configKey: 'some.key',
    });

    expect(error instanceof AppError).toBe(true);
    expect(error.code).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(error.context?.configPath).toBe('/path/to/config');
    expect(error.context?.configKey).toBe('some.key');
  });

  it('should still support HookError', () => {
    const error = new HookError('Hook failed', {
      hookName: 'test-hook',
      hookPath: '/path/to/hook',
    });

    expect(error instanceof AppError).toBe(true);
    expect(error.code).toBe(ERROR_CODES.HOOK_EXECUTION_FAILED);
    expect(error.context?.hookName).toBe('test-hook');
    expect(error.context?.hookPath).toBe('/path/to/hook');
  });

  it('should still support NetworkError', () => {
    const error = new NetworkError('Connection failed', {
      url: 'https://example.com',
      statusCode: 404,
    });

    expect(error instanceof AppError).toBe(true);
    expect(error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    expect(error.context?.url).toBe('https://example.com');
    expect(error.context?.statusCode).toBe(404);
  });

  it('should still support FileSystemError', () => {
    const error = new FileSystemError('File not found', {
      path: '/path/to/file',
      operation: 'read',
    });

    expect(error instanceof AppError).toBe(true);
    expect(error.code).toBe(ERROR_CODES.FILESYSTEM_OPERATION_FAILED);
    expect(error.context?.path).toBe('/path/to/file');
    expect(error.context?.operation).toBe('read');
  });

  it('should still support PermissionError', () => {
    const error = new PermissionError('Access denied', {
      path: '/path/to/file',
    });

    expect(error instanceof AppError).toBe(true);
    expect(error.code).toBe(ERROR_CODES.PERMISSION_DENIED);
    expect(error.context?.path).toBe('/path/to/file');
  });

  it('should still support CommandError', () => {
    const error = new CommandError('Command failed', {
      command: 'npm install',
      stdout: 'Installing...',
      stderr: 'Error occurred',
    });

    expect(error instanceof AppError).toBe(true);
    expect(error.code).toBe(ERROR_CODES.COMMAND_EXECUTION_FAILED);
    expect(error.context?.command).toBe('npm install');
  });

  it('should still support InternalError', () => {
    const error = new InternalError('Something went wrong');

    expect(error instanceof AppError).toBe(true);
    expect(error.code).toBe(ERROR_CODES.INTERNAL);
    expect(error.message).toContain('Internal error');
  });

  it('should still support CLIError', () => {
    const error = new CLIError('CLI error', {
      exitCode: 2,
      isUserFacing: false,
      suggestion: 'Try again later',
    });

    expect(error instanceof AppError).toBe(true);
    expect(error.code).toBe(ERROR_CODES.UNKNOWN);
    expect(error.exitCode).toBe(2);
    expect(error.isUserFacing).toBe(false);
    expect(error.suggestion).toBe('Try again later');
  });
});

describe('Type Guards', () => {
  it('should identify AppError correctly', () => {
    const appError = new AppError('App error');
    const regularError = new Error('Regular error');

    expect(isAppError(appError)).toBe(true);
    expect(isAppError(regularError)).toBe(false);
    expect(isAppError('string')).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('should identify errors with suggestions', () => {
    const errorWithSuggestion = new AppError('Error', { suggestion: 'Try this' });
    const errorWithoutSuggestion = new AppError('Error');
    const errorWithEmptySuggestion = new AppError('Error', { suggestion: '' });

    expect(errorWithSuggestion.suggestion).toBe('Try this');
    expect(errorWithoutSuggestion.suggestion).toBeUndefined();
    expect(errorWithEmptySuggestion.suggestion).toBe('');
  });
});

describe('Error Formatting', () => {
  describe('Console Output', () => {
    it('should format AppError for console', () => {
      const error = new AppError('Test error', {
        code: ERROR_CODES.VALIDATION_FAILED,
        suggestion: 'Try again',
      });

      const formatted = formatError(error);

      expect(formatted).toContain('Error: Test error');
      expect(formatted).toContain('💡 Suggestion: Try again');
    });

    it('should format AppError without suggestion', () => {
      const error = new AppError('Test error');

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
      const error = new AppError('Test error');

      const formatted = formatError(error, { showStackTrace: true });

      expect(formatted).toContain('Stack trace:');
    });
  });

  describe('JSON Output', () => {
    it('should format AppError as JSON', () => {
      const error = new AppError('Test error', {
        code: ERROR_CODES.CONFIG_INVALID,
        exitCode: 2,
        suggestion: 'Try again',
      });

      const formatted = formatError(error, { isJson: true });
      const parsed = JSON.parse(formatted);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Test error');
      expect(parsed.errorType).toBe('AppError');
      expect(parsed.errorCode).toBe(ERROR_CODES.CONFIG_INVALID);
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

    it('should include context details when requested', () => {
      const error = new AppError('Config error', {
        code: ERROR_CODES.CONFIG_INVALID,
        context: {
          configPath: '/path/to/config',
          configKey: 'some.key',
        },
      });

      const formatted = formatError(error, {
        isJson: true,
        includeDetails: true,
      });
      const parsed = JSON.parse(formatted);

      expect(parsed.context.configPath).toBe('/path/to/config');
      expect(parsed.context.configKey).toBe('some.key');
    });

    it('should include stack trace in JSON when requested', () => {
      const error = new AppError('Test error');

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
    const appError = new AppError('Test');
    const validationError = new ValidationError('Validation failed');

    expect(appError instanceof AppError).toBe(true);
    expect(appError instanceof Error).toBe(true);

    expect(validationError instanceof AppError).toBe(true);
    expect(validationError instanceof Error).toBe(true);
  });

  it('should have AppError as the name for all errors', () => {
    const errors = [
      new AppError('test'),
      new ValidationError('test'),
      new ConfigError('test'),
      new HookError('test'),
      new NetworkError('test'),
      new FileSystemError('test'),
      new PermissionError('test'),
      new CommandError('test'),
      new InternalError('test'),
    ];

    errors.forEach(error => {
      expect(error.name).toBe('AppError');
      expect(error instanceof AppError).toBe(true);
    });
  });
});
