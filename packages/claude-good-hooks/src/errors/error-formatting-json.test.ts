/**
 * Tests for error formatting JSON output
 */

import { describe, it, expect } from 'vitest';
import { AppError, formatError } from './index.js';

describe('Error Formatting JSON Output', () => {
  it('should format AppError as JSON', () => {
    const error = new AppError('Something went wrong', {
      exitCode: 2,
      suggestion: 'Try again later',
    });

    const formatted = formatError(error, { json: true });
    const parsed = JSON.parse(formatted);

    expect(parsed.message).toBe('Something went wrong');
    expect(parsed.suggestion).toBe('Try again later');
    expect(parsed.exitCode).toBe(2);
    expect(parsed.name).toBe('AppError');
  });

  it('should format regular error as JSON', () => {
    const error = new Error('Regular error');

    const formatted = formatError(error, { json: true });
    const parsed = JSON.parse(formatted);

    expect(parsed.message).toBe('Regular error');
    expect(parsed.name).toBe('Error');
    expect(parsed.exitCode).toBe(1);
  });

  it('should include context details when requested', () => {
    const error = new AppError('Context error');
    const context = { userId: '123', action: 'test' };

    const formatted = formatError(error, { json: true, context });
    const parsed = JSON.parse(formatted);

    expect(parsed.message).toBe('Context error');
    expect(parsed.context).toEqual(context);
    expect(parsed.context.userId).toBe('123');
    expect(parsed.context.action).toBe('test');
  });

  it('should include stack trace in JSON when requested', () => {
    const error = new AppError('Stack trace error');

    const formatted = formatError(error, {
      json: true,
      includeStack: true,
    });
    const parsed = JSON.parse(formatted);

    expect(parsed.message).toBe('Stack trace error');
    expect(parsed.stack).toBeDefined();
    expect(typeof parsed.stack).toBe('string');
    expect(parsed.stack).toContain('at '); // Stack trace indicator
  });
});
