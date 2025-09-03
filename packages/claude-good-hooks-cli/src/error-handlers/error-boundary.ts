/**
 * Error boundary utilities for wrapping functions with consistent error handling
 */

import { CLIError, formatError, ErrorOutputOptions, ValidationError, InternalError, isCLIError } from '../errors/index.js';

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
    const exitCode = isCLIError(error) ? error.exitCode : 1;
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
    } catch (error) {
      // For CLI errors with context, we'll create a new error with context
      if (isCLIError(error) && errorContext && !error.message.includes(errorContext)) {
        // We can't modify the common attributes directly, so we'll wrap it in a new CLIError
        const contextualError = new CLIError(`${errorContext}: ${error.message}`, {
          exitCode: error.exitCode,
          isUserFacing: error.isUserFacing,
          suggestion: error.suggestion,
          cause: error.cause || (error instanceof Error ? error : undefined),
        });
        error = contextualError;
      }
      
      // Try fallback if available
      if (fallback) {
        try {
          return await fallback(error, ...args);
        } catch (fallbackError) {
          // If fallback fails, use original error
          if (rethrow) {
            throw error;
          }
          handleError(error);
        }
      }
      
      if (rethrow) {
        throw error;
      } else {
        handleError(error);
      }
      
      // This should never be reached, but TypeScript needs it
      throw new InternalError('Error boundary reached unreachable code');
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
    } catch (error) {
      // For CLI errors with context, we'll create a new error with context
      if (isCLIError(error) && errorContext && !error.message.includes(errorContext)) {
        // We can't modify the common attributes directly, so we'll wrap it in a new CLIError
        const contextualError = new CLIError(`${errorContext}: ${error.message}`, {
          exitCode: error.exitCode,
          isUserFacing: error.isUserFacing,
          suggestion: error.suggestion,
          cause: error.cause || (error instanceof Error ? error : undefined),
        });
        error = contextualError;
      }
      
      // Try fallback if available
      if (fallback) {
        try {
          return fallback(error, ...args);
        } catch (fallbackError) {
          // If fallback fails, use original error
          if (rethrow) {
            throw error;
          }
          handleError(error);
        }
      }
      
      if (rethrow) {
        throw error;
      } else {
        handleError(error);
      }
      
      // This should never be reached, but TypeScript needs it
      throw new InternalError('Error boundary reached unreachable code');
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