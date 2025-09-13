/**
 * Tests for async error boundaries
 */

import { describe, it, expect, vi } from 'vitest';
import { withErrorBoundary } from './handler.js';

describe('Async Error Boundaries', () => {
  describe('withErrorBoundary', () => {
    it('should execute function successfully', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const wrappedFn = withErrorBoundary(fn);

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should add error context when rethrow is true', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Original error'));
      const wrappedFn = withErrorBoundary(fn, {
        errorContext: 'Test context',
        rethrow: true,
      });

      await expect(wrappedFn()).rejects.toThrow('Original error');
    });

    it('should use fallback when provided', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Original error'));
      const fallback = vi.fn().mockResolvedValue('fallback result');
      const wrappedFn = withErrorBoundary(fn, {
        fallback,
        rethrow: true,
      });

      const result = await wrappedFn('arg');

      expect(result).toBe('fallback result');
      expect(fallback).toHaveBeenCalledWith(expect.any(Error), 'arg');
    });

    it('should handle fallback failure', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Original error'));
      const fallback = vi.fn().mockRejectedValue(new Error('Fallback error'));
      const wrappedFn = withErrorBoundary(fn, {
        fallback,
        rethrow: true,
      });

      await expect(wrappedFn()).rejects.toThrow('Original error');
    });
  });
});