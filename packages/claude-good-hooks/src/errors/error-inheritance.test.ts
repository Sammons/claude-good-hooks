/**
 * Tests for error inheritance behavior
 */

import { describe, it, expect } from 'vitest';
import { AppError, ValidationError, ConfigError } from './index.js';

describe('Error Inheritance', () => {
  it('should maintain proper inheritance chain', () => {
    const error = new AppError('Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');

    // Test that instanceof works correctly
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });

  it('should have AppError as the name for all errors', () => {
    const validationError = new ValidationError('Validation failed');
    const configError = new ConfigError('Config failed');
    const regularAppError = new AppError('App failed');

    expect(validationError.name).toBe('AppError');
    expect(configError.name).toBe('AppError');
    expect(regularAppError.name).toBe('AppError');

    // All should be instances of both Error and AppError
    expect(validationError instanceof Error).toBe(true);
    expect(validationError instanceof AppError).toBe(true);
    expect(configError instanceof Error).toBe(true);
    expect(configError instanceof AppError).toBe(true);
  });
});