/**
 * Unified error handling for claude-good-hooks CLI
 * Export only the AppError class and utilities
 */

export {
  AppError,
  ERROR_CODES,
  type ErrorCode,
  type AppErrorOptions,
  isAppError,
  formatError,
} from './app-error.js';

// For backward compatibility during migration, provide aliases
import { AppError, ERROR_CODES } from './app-error.js';

/**
 * @deprecated Use AppError.validation() instead
 */
export const ValidationError = class extends AppError {
  constructor(message: string, options: any = {}) {
    super(message, {
      code: ERROR_CODES.VALIDATION_FAILED,
      ...options,
    });
  }
};

/**
 * @deprecated Use AppError.config() instead
 */
export const ConfigError = class extends AppError {
  constructor(message: string, options: any = {}) {
    super(message, {
      code: ERROR_CODES.CONFIG_INVALID,
      ...options,
    });
  }
};

/**
 * @deprecated Use AppError.hook() instead
 */
export const HookError = class extends AppError {
  constructor(message: string, options: any = {}) {
    super(message, {
      code: ERROR_CODES.HOOK_EXECUTION_FAILED,
      ...options,
    });
  }
};

/**
 * @deprecated Use AppError.fileSystem() instead
 */
export const FileSystemError = class extends AppError {
  constructor(message: string, options: any = {}) {
    super(message, {
      code: ERROR_CODES.FILESYSTEM_OPERATION_FAILED,
      ...options,
    });
  }
};

/**
 * @deprecated Use AppError.permission() instead
 */
export const PermissionError = class extends AppError {
  constructor(message: string, options: any = {}) {
    super(message, {
      code: ERROR_CODES.PERMISSION_DENIED,
      ...options,
    });
  }
};

/**
 * @deprecated Use AppError.command() instead
 */
export const CommandError = class extends AppError {
  constructor(message: string, options: any = {}) {
    super(message, {
      code: ERROR_CODES.COMMAND_EXECUTION_FAILED,
      ...options,
    });
  }
};

/**
 * @deprecated Use AppError with ERROR_CODES.NETWORK_ERROR instead
 */
export const NetworkError = class extends AppError {
  constructor(message: string, options: any = {}) {
    super(message, {
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
      suggestion: options.suggestion || 'Check your internet connection and try again.',
      ...options,
    });
  }
};

/**
 * @deprecated Use AppError with ERROR_CODES.INTERNAL instead
 */
export const InternalError = class extends AppError {
  constructor(message: string, options: any = {}) {
    super(`Internal error: ${message}`, {
      code: ERROR_CODES.INTERNAL,
      isUserFacing: false,
      suggestion: options.suggestion || 'This is likely a bug in claude-good-hooks. Please report it.',
      ...options,
    });
  }
};

/**
 * @deprecated Use AppError instead
 */
export const CLIError = class extends AppError {
  constructor(message: string, options: any = {}) {
    super(message, {
      code: ERROR_CODES.UNKNOWN,
      ...options,
    });
  }
};

/**
 * @deprecated Use isAppError instead
 */
export function isCLIError(error: unknown): boolean {
  return error instanceof AppError;
}
