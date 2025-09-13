/**
 * Tests for sync error boundaries
 */

import { describe, it, expect, vi } from 'vitest';
import { withSyncErrorBoundary } from './handler.js';

describe('Sync Error Boundaries', () => {
  describe('withSyncErrorBoundary', () => {
    it('should execute synchronous function successfully', () => {
      const fn = vi.fn().mockReturnValue('success');
      const wrappedFn = withSyncErrorBoundary(fn);

      const result = wrappedFn('arg');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg');
    });

    it('should handle synchronous errors', () => {
      const fn = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const wrappedFn = withSyncErrorBoundary(fn, { rethrow: true });

      expect(() => wrappedFn()).toThrow('Sync error');
    });

    it('should use sync fallback', () => {
      const fn = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const fallback = vi.fn().mockReturnValue('fallback result');
      const wrappedFn = withSyncErrorBoundary(fn, {
        fallback,
        rethrow: true,
      });

      const result = wrappedFn('arg');

      expect(result).toBe('fallback result');
      expect(fallback).toHaveBeenCalledWith(expect.any(Error), 'arg');
    });
  });
});