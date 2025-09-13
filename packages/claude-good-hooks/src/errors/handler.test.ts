/**
 * Tests for error handler utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withErrorBoundary,
  withSyncErrorBoundary,
  safeExecute,
  safeSyncExecute,
  validateInput,
  assert,
  withRetry,
  withFallback,
} from './handler.js';
import { CLIError, ValidationError } from './index.js';

describe('Error Boundaries', () => {
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

describe('Safe Execution', () => {
  describe('safeExecute', () => {
    it('should execute async operation successfully', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await safeExecute(operation);

      expect(result).toBe('success');
    });

    it('should rethrow CLI errors as-is', async () => {
      const cliError = new ValidationError('CLI error');
      const operation = vi.fn().mockRejectedValue(cliError);

      await expect(safeExecute(operation)).rejects.toBe(cliError);
    });

    it('should convert non-CLI errors to CLI errors', async () => {
      const regularError = new Error('Regular error');
      const operation = vi.fn().mockRejectedValue(regularError);

      await expect(safeExecute(operation, 'Context')).rejects.toThrow(CLIError);
      await expect(safeExecute(operation, 'Context')).rejects.toThrow('Context: Regular error');
    });
  });

  describe('safeSyncExecute', () => {
    it('should execute sync operation successfully', () => {
      const operation = vi.fn().mockReturnValue('success');

      const result = safeSyncExecute(operation);

      expect(result).toBe('success');
    });

    it('should convert sync errors to CLI errors', () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      expect(() => safeSyncExecute(operation, 'Context')).toThrow(CLIError);
      expect(() => safeSyncExecute(operation, 'Context')).toThrow('Context: Sync error');
    });
  });
});

describe('Validation Utilities', () => {
  describe('validateInput', () => {
    it('should return value for valid input', () => {
      const validator = (value: string) => value.length > 0;

      const result = validateInput('test', validator, 'input');

      expect(result).toBe('test');
    });

    it('should throw ValidationError for false validator', () => {
      const validator = () => false;

      expect(() => validateInput('test', validator, 'input')).toThrow(ValidationError);
      expect(() => validateInput('test', validator, 'input')).toThrow('Invalid input');
    });

    it('should throw ValidationError with custom message', () => {
      const validator = (value: string) => (value.length > 5 ? true : 'too short');

      expect(() => validateInput('test', validator, 'input')).toThrow('Invalid input: too short');
    });

    it('should include suggestion in error', () => {
      const validator = () => false;

      try {
        validateInput('test', validator, 'input', 'Try a different value');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).suggestion).toBe('Try a different value');
      }
    });
  });

  describe('assert', () => {
    it('should pass for truthy conditions', () => {
      expect(() => assert(true, 'Should not throw')).not.toThrow();
      expect(() => assert('truthy', 'Should not throw')).not.toThrow();
      expect(() => assert(1, 'Should not throw')).not.toThrow();
    });

    it('should throw ValidationError for falsy conditions', () => {
      expect(() => assert(false, 'Test assertion')).toThrow(ValidationError);
      expect(() => assert(false, 'Test assertion')).toThrow('Test assertion');
      expect(() => assert(0, 'Zero is falsy')).toThrow('Zero is falsy');
      expect(() => assert('', 'Empty string is falsy')).toThrow('Empty string is falsy');
    });

    it('should include suggestion in assertion error', () => {
      try {
        assert(false, 'Test assertion', 'Try something else');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).suggestion).toBe('Try something else');
      }
    });
  });
});

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
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect maxRetries limit', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(withRetry(operation, { maxRetries: 2 })).rejects.toThrow(CLIError);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry validation errors', async () => {
      const operation = vi.fn().mockRejectedValue(new ValidationError('Invalid input'));

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
      ).rejects.toThrow(CLIError);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });
});

describe('Fallback Logic', () => {
  describe('withFallback', () => {
    it('should use primary operation when successful', async () => {
      const primary = vi.fn().mockResolvedValue('primary result');
      const fallback = vi.fn().mockResolvedValue('fallback result');

      const result = await withFallback(primary, fallback);

      expect(result).toBe('primary result');
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use fallback when primary fails', async () => {
      const primary = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallback = vi.fn().mockResolvedValue('fallback result');

      const result = await withFallback(primary, fallback);

      expect(result).toBe('fallback result');
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should throw original error when fallback also fails', async () => {
      const primaryError = new Error('Primary failed');
      const primary = vi.fn().mockRejectedValue(primaryError);
      const fallback = vi.fn().mockRejectedValue(new Error('Fallback failed'));

      await expect(withFallback(primary, fallback)).rejects.toBe(primaryError);
    });

    it('should not use fallback for validation errors', async () => {
      const validationError = new ValidationError('Invalid input');
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

// Mock console methods for testing
const _mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const _mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const _mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
