/**
 * Tests for deprecated error classes (backward compatibility)
 */

import { describe, it, expect } from 'vitest';
import {
  ERROR_CODES,
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

describe('Deprecated Error Classes (Backward Compatibility)', () => {
  it('should still support ValidationError', () => {
    const error = new ValidationError('Validation failed');

    expect(error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Validation failed');
  });

  it('should still support ConfigError', () => {
    const error = new ConfigError('Config error');

    expect(error.code).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Config error');
  });

  it('should still support HookError', () => {
    const error = new HookError('Hook error');

    expect(error.code).toBe(ERROR_CODES.HOOK_EXECUTION_FAILED);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Hook error');
  });

  it('should still support NetworkError', () => {
    const error = new NetworkError('Network error');

    expect(error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Network error');
  });

  it('should still support FileSystemError', () => {
    const error = new FileSystemError('FS error');

    expect(error.code).toBe(ERROR_CODES.FILESYSTEM_OPERATION_FAILED);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('FS error');
  });

  it('should still support PermissionError', () => {
    const error = new PermissionError('Permission error');

    expect(error.code).toBe(ERROR_CODES.PERMISSION_DENIED);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Permission error');
  });

  it('should still support CommandError', () => {
    const error = new CommandError('Command error');

    expect(error.code).toBe(ERROR_CODES.COMMAND_EXECUTION_FAILED);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Command error');
  });

  it('should still support InternalError', () => {
    const error = new InternalError('Internal error');

    expect(error.code).toBe(ERROR_CODES.INTERNAL);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Internal error');
  });

  it('should still support CLIError', () => {
    const error = new CLIError('CLI error', {
      exitCode: 2,
    });

    expect(error.name).toBe('AppError');
    expect(error.message).toBe('CLI error');
    expect(error.exitCode).toBe(2);
  });
});