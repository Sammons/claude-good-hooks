/**
 * Tests for fallback logic utilities
 */

import { describe, it, expect, vi } from 'vitest';
import { withFallback } from './handler.js';
import { ValidationError } from './index.js';

describe('Fallback Logic', () => {
  describe('withFallback', () => {
    it('should use primary operation when successful', async () => {
      const primary = vi.fn().mockResolvedValue('primary result');
      const fallback = vi.fn().mockResolvedValue('fallback result');

      const result = await withFallback(primary, fallback);

      expect(result).toBe('primary result');
      expect(primary).toHaveBeenCalled();
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use fallback when primary fails', async () => {
      const primary = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallback = vi.fn().mockResolvedValue('fallback result');

      const result = await withFallback(primary, fallback);

      expect(result).toBe('fallback result');
      expect(primary).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    it('should throw original error when fallback also fails', async () => {
      const primaryError = new Error('Primary failed');
      const primary = vi.fn().mockRejectedValue(primaryError);
      const fallback = vi.fn().mockRejectedValue(new Error('Fallback failed'));

      await expect(withFallback(primary, fallback)).rejects.toBe(primaryError);
    });

    it('should not use fallback for validation errors', async () => {
      const validationError = new ValidationError('Validation failed');
      const primary = vi.fn().mockRejectedValue(validationError);
      const fallback = vi.fn().mockResolvedValue('fallback result');

      await expect(withFallback(primary, fallback)).rejects.toBe(validationError);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use custom shouldUseFallback function', async () => {
      const primary = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallback = vi.fn().mockResolvedValue('fallback result');
      const shouldUseFallback = vi.fn().mockReturnValue(false);

      await expect(
        withFallback(primary, fallback, {
          shouldUseFallback,
        })
      ).rejects.toThrow('Primary failed');

      expect(shouldUseFallback).toHaveBeenCalledWith(expect.any(Error));
      expect(fallback).not.toHaveBeenCalled();
    });
  });
});