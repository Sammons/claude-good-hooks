/**
 * Tests for retry logic utilities
 */

import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './handler.js';
import { AppError, ValidationError } from './index.js';

describe('Retry Logic', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operations', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect maxRetries limit', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(withRetry(operation, { maxRetries: 2 })).rejects.toThrow(AppError);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry validation errors', async () => {
      const operation = vi.fn().mockRejectedValue(new ValidationError('Validation failed'));

      await expect(withRetry(operation, { maxRetries: 3 })).rejects.toThrow(ValidationError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use custom shouldRetry function', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Custom error'));
      const shouldRetry = vi.fn().mockReturnValue(false);

      await expect(
        withRetry(operation, {
          maxRetries: 3,
          shouldRetry,
        })
      ).rejects.toThrow('Custom error');

      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});
