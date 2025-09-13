/**
 * Tests for error formatting console output
 */

import { describe, it, expect } from 'vitest';
import { AppError, formatError } from './index.js';

describe('Error Formatting Console Output', () => {
  it('should format AppError for console', () => {
    const error = new AppError('Something went wrong', {
      suggestion: 'Try again later',
    });

    const formatted = formatError(error);

    expect(formatted).toContain('Something went wrong');
    expect(formatted).toContain('Try again later');
    expect(formatted).not.toContain('"'); // Should not have JSON quotes
  });

  it('should format AppError without suggestion', () => {
    const error = new AppError('Something went wrong');

    const formatted = formatError(error);

    expect(formatted).toContain('Something went wrong');
    expect(formatted).not.toContain('suggestion'); // Should not mention suggestion
  });

  it('should format regular error for console', () => {
    const error = new Error('Regular error');

    const formatted = formatError(error);

    expect(formatted).toContain('Regular error');
  });

  it('should format string error for console', () => {
    const formatted = formatError('String error');

    expect(formatted).toContain('String error');
  });

  it('should include stack trace when requested', () => {
    const error = new AppError('Test error');

    const formatted = formatError(error, { includeStack: true });

    expect(formatted).toContain('Test error');
    expect(formatted).toContain('at '); // Stack trace indicator
  });
});