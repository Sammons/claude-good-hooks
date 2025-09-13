/**
 * Tests for AppError code to exit code mapping
 */

import { describe, it, expect } from 'vitest';
import { AppError, ERROR_CODES } from './index.js';

describe('AppError Exit Code Mapping', () => {
  it('should map error codes to exit codes correctly', () => {
    const testCases = [
      { code: ERROR_CODES.VALIDATION_FAILED, expectedExit: 2 },
      { code: ERROR_CODES.CONFIG_INVALID, expectedExit: 3 },
      { code: ERROR_CODES.HOOK_EXECUTION_FAILED, expectedExit: 4 },
      { code: ERROR_CODES.NETWORK_REQUEST_FAILED, expectedExit: 9 },
      { code: ERROR_CODES.FILESYSTEM_OPERATION_FAILED, expectedExit: 6 },
      { code: ERROR_CODES.PERMISSION_DENIED, expectedExit: 7 },
      { code: ERROR_CODES.COMMAND_EXECUTION_FAILED, expectedExit: 8 },
      { code: ERROR_CODES.MODULE_NOT_FOUND, expectedExit: 5 },
      { code: ERROR_CODES.TIMEOUT, expectedExit: 10 },
      { code: ERROR_CODES.INTERNAL, expectedExit: 99 },
      { code: ERROR_CODES.UNKNOWN, expectedExit: 1 },
    ];

    testCases.forEach(({ code, expectedExit }) => {
      const error = new AppError('Test', { code });
      expect(error.exitCode).toBe(expectedExit);
    });
  });
});
