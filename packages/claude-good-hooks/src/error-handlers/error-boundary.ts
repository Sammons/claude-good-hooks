/**
 * Error boundary utilities for wrapping functions with consistent error handling
 */

import { AppError, ERROR_CODES, isAppError, formatError } from '../errors/app-error.js';

export interface ErrorOutputOptions {
  isJson?: boolean;
  showStackTrace?: boolean;
  includeDetails?: boolean;
}

/**
 * Global error handler that processes errors and exits gracefully
 */
export function handleError(
  error: unknown,
  options: ErrorOutputOptions & {
    exit?: boolean;
    errorPrefix?: string;
  } = {}
): never | void {
  const { exit = true, errorPrefix, ...formatOptions } = options;

  // Format the error for output
  const formattedError = formatError(error, formatOptions);

  if (formatOptions.isJson) {
    console.log(formattedError);
  } else {
    const prefix = errorPrefix ? `${errorPrefix}: ` : '';
    console.error(prefix + formattedError);
  }

  if (exit) {
    const exitCode = isAppError(error) ? error.exitCode : 1;
    process.exit(exitCode);
  }
}

/**
 * Async error boundary that wraps async functions to provide consistent error handling
 */
export function withErrorBoundary<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    errorContext?: string;
    fallback?: (error: unknown, ...args: T) => Promise<R> | R;
    rethrow?: boolean;
  } = {}
): (...args: T) => Promise<R> {
  const { errorContext, fallback, rethrow = true } = options;

  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (caughtError: unknown) {
      // For CLI errors with context, we'll create a new error with context
      let processedError: unknown = caughtError;

      if (isAppError(caughtError) && errorContext && !caughtError.message.includes(errorContext)) {
        // We'll wrap it in a new AppError with context
        processedError = new AppError(`${errorContext}: ${caughtError.message}`, {
          code: caughtError.code,
          exitCode: caughtError.exitCode,
          isUserFacing: caughtError.isUserFacing,
          suggestion: caughtError.suggestion,
          cause: caughtError.cause || (caughtError instanceof Error ? caughtError : undefined),
        });
      }

      // Try fallback if available
      if (fallback) {
        try {
          return await fallback(processedError, ...args);
        } catch {
          // If fallback fails, use processed error
          if (rethrow) {
            throw processedError;
          }
          handleError(processedError);
        }
      }

      if (rethrow) {
        throw processedError;
      } else {
        handleError(processedError);
      }

      // This should never be reached, but TypeScript needs it
      throw new AppError('Error boundary reached unreachable code', {
        code: ERROR_CODES.INTERNAL,
      });
    }
  };
}

/**
 * Sync error boundary for synchronous functions
 */
export function withSyncErrorBoundary<T extends unknown[], R>(
  fn: (...args: T) => R,
  options: {
    errorContext?: string;
    fallback?: (error: unknown, ...args: T) => R;
    rethrow?: boolean;
  } = {}
): (...args: T) => R {
  const { errorContext, fallback, rethrow = true } = options;

  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (caughtError: unknown) {
      // For CLI errors with context, we'll create a new error with context
      let processedError: unknown = caughtError;

      if (isAppError(caughtError) && errorContext && !caughtError.message.includes(errorContext)) {
        // We'll wrap it in a new AppError with context
        processedError = new AppError(`${errorContext}: ${caughtError.message}`, {
          code: caughtError.code,
          exitCode: caughtError.exitCode,
          isUserFacing: caughtError.isUserFacing,
          suggestion: caughtError.suggestion,
          cause: caughtError.cause || (caughtError instanceof Error ? caughtError : undefined),
        });
      }

      // Try fallback if available
      if (fallback) {
        try {
          return fallback(processedError, ...args);
        } catch {
          // If fallback fails, use processed error
          if (rethrow) {
            throw processedError;
          }
          handleError(processedError);
        }
      }

      if (rethrow) {
        throw processedError;
      } else {
        handleError(processedError);
      }

      // This should never be reached, but TypeScript needs it
      throw new AppError('Error boundary reached unreachable code', {
        code: ERROR_CODES.INTERNAL,
      });
    }
  };
}

/**
 * Main entry point error handler for CLI commands
 */
export function createMainErrorHandler(options: ErrorOutputOptions = {}) {
  return (error: unknown): never => {
    handleError(error, { ...options, exit: true });
  };
}
