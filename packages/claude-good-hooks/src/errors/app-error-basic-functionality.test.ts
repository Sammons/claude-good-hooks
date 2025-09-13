/**
 * Tests for AppError basic functionality
 */

import { describe, it, expect } from 'vitest';
import { AppError, ERROR_CODES } from './index.js';

describe('AppError Basic Functionality', () => {
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
      suggestion: 'Try checking your config',
      cause,
    });

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ERROR_CODES.CONFIG_INVALID);
    expect(error.exitCode).toBe(3);
    expect(error.isUserFacing).toBe(false);
    expect(error.suggestion).toBe('Try checking your config');
    expect(error.cause).toBe(cause);
  });
});
