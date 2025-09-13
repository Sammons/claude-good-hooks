/**
 * Tests for safe execution utilities
 */

import { describe, it, expect, vi } from 'vitest';
import { safeExecute, safeSyncExecute } from './handler.js';
import { AppError, CLIError } from './index.js';

describe('Safe Execution', () => {
  describe('safeExecute', () => {
    it('should execute async operation successfully', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await safeExecute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should rethrow CLI errors as-is', async () => {
      const cliError = new CLIError('CLI error');
      const operation = vi.fn().mockRejectedValue(cliError);

      await expect(safeExecute(operation)).rejects.toBe(cliError);
    });

    it('should convert non-CLI errors to CLI errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Regular error'));

      await expect(safeExecute(operation, 'Context')).rejects.toThrow(AppError);
      await expect(safeExecute(operation, 'Context')).rejects.toThrow('Context: Regular error');
    });
  });

  describe('safeSyncExecute', () => {
    it('should execute sync operation successfully', () => {
      const operation = vi.fn().mockReturnValue('success');

      const result = safeSyncExecute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should convert sync errors to CLI errors', () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      expect(() => safeSyncExecute(operation, 'Context')).toThrow(AppError);
      expect(() => safeSyncExecute(operation, 'Context')).toThrow('Context: Sync error');
    });
  });
});