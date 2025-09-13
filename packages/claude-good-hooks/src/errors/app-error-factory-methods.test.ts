/**
 * Tests for AppError factory methods
 */

import { describe, it, expect } from 'vitest';
import { AppError, ERROR_CODES } from './index.js';

describe('AppError Factory Methods', () => {
  it('should create validation error', () => {
    const error = AppError.validation('Invalid input');

    expect(error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(error.message).toBe('Invalid input');
    expect(error.exitCode).toBe(2); // Validation errors use exit code 2
  });

  it('should create config error', () => {
    const error = AppError.config('Invalid configuration');

    expect(error.code).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(error.message).toBe('Invalid configuration');
    expect(error.exitCode).toBe(3); // Config errors use exit code 3
  });

  it('should create hook error', () => {
    const error = AppError.hook('Hook execution failed');

    expect(error.code).toBe(ERROR_CODES.HOOK_EXECUTION_FAILED);
    expect(error.message).toBe('Hook execution failed');
    expect(error.exitCode).toBe(4); // Hook errors use exit code 4
  });

  it('should create network error with default suggestion', () => {
    const error = AppError.network('Connection failed');

    expect(error.code).toBe(ERROR_CODES.NETWORK_REQUEST_FAILED);
    expect(error.exitCode).toBe(9); // Network errors use exit code 9
    expect(error.suggestion).toContain('connection'); // Should have network suggestion
  });

  it('should create filesystem error', () => {
    const error = AppError.filesystem('File not found');

    expect(error.code).toBe(ERROR_CODES.FILESYSTEM_OPERATION_FAILED);
    expect(error.message).toBe('File not found');
    expect(error.exitCode).toBe(6); // Filesystem errors use exit code 6
  });

  it('should create permission error with auto suggestion', () => {
    const error = AppError.permission('Access denied');

    expect(error.code).toBe(ERROR_CODES.PERMISSION_DENIED);
    expect(error.message).toBe('Access denied');
    expect(error.exitCode).toBe(7); // Permission errors use exit code 7
    expect(error.suggestion).toContain('permissions'); // Should have permission suggestion
  });

  it('should create command error', () => {
    const error = AppError.command('Command failed');

    expect(error.code).toBe(ERROR_CODES.COMMAND_EXECUTION_FAILED);
    expect(error.message).toBe('Command failed');
    expect(error.exitCode).toBe(8); // Command errors use exit code 8
  });

  it('should create internal error', () => {
    const error = AppError.internal('Something went wrong internally');

    expect(error.code).toBe(ERROR_CODES.INTERNAL);
    expect(error.exitCode).toBe(99);
    expect(error.isUserFacing).toBe(false); // Internal errors are not user-facing
  });
});
