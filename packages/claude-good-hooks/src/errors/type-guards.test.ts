/**
 * Tests for error type guards
 */

import { describe, it, expect } from 'vitest';
import { AppError, isAppError } from './index.js';

describe('Error Type Guards', () => {
  it('should identify AppError correctly', () => {
    const appError = new AppError('Test error');
    const regularError = new Error('Regular error');
    const notAnError = { message: 'Not an error' };

    expect(isAppError(appError)).toBe(true);
    expect(isAppError(regularError)).toBe(false);
    expect(isAppError(notAnError)).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
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
