/**
 * Error handling utilities and boundaries for claude-good-hooks CLI
 */

import { CLIError, formatError, ErrorOutputOptions, ValidationError, InternalError, isCLIError } from './index.js';

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
      // Add context to CLI errors if provided
      if (isCLIError(error) && errorContext && !error.message.includes(errorContext)) {
        error.message = `${errorContext}: ${error.message}`;
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
      // Add context to CLI errors if provided
      if (isCLIError(error) && errorContext && !error.message.includes(errorContext)) {
        error.message = `${errorContext}: ${error.message}`;
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
 * Safe execution wrapper that converts non-CLI errors to appropriate CLI errors
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isCLIError(error)) {
      throw error;
    }
    
    // Convert unknown errors to CLI errors with context
    const message = error instanceof Error ? error.message : String(error);
    const contextualMessage = errorContext ? `${errorContext}: ${message}` : message;
    
    throw new CLIError(contextualMessage, {
      cause: error instanceof Error ? error : undefined,
      suggestion: 'If this problem persists, please report it as a bug.'
    });
  }
}

/**
 * Safe sync execution wrapper
 */
export function safeSyncExecute<T>(
  operation: () => T,
  errorContext?: string
): T {
  try {
    return operation();
  } catch (error) {
    if (isCLIError(error)) {
      throw error;
    }
    
    // Convert unknown errors to CLI errors with context
    const message = error instanceof Error ? error.message : String(error);
    const contextualMessage = errorContext ? `${errorContext}: ${message}` : message;
    
    throw new CLIError(contextualMessage, {
      cause: error instanceof Error ? error : undefined,
      suggestion: 'If this problem persists, please report it as a bug.'
    });
  }
}

/**
 * Validation helper that throws ValidationError for failed checks
 */
export function validateInput<T>(
  value: T,
  validator: (value: T) => boolean | string,
  fieldName: string,
  suggestion?: string
): T {
  const result = validator(value);
  
  if (result === false) {
    throw new ValidationError(`Invalid ${fieldName}`, { suggestion });
  }
  
  if (typeof result === 'string') {
    throw new ValidationError(`Invalid ${fieldName}: ${result}`, { suggestion });
  }
  
  return value;
}

/**
 * Assert helper that throws ValidationError for failed assertions
 */
export function assert(
  condition: unknown, 
  message: string, 
  suggestion?: string
): asserts condition {
  if (!condition) {
    throw new ValidationError(message, { suggestion });
  }
}

/**
 * Async retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    errorContext?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry,
    errorContext
  } = options;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error, attempt)) {
        break;
      }
      
      // Don't retry user-facing validation errors
      if (error instanceof ValidationError) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries failed
  if (lastError) {
    if (isCLIError(lastError)) {
      throw lastError;
    }
    
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    const contextualMessage = errorContext ? `${errorContext}: ${message}` : message;
    
    throw new CLIError(`Operation failed after ${maxRetries} attempts: ${contextualMessage}`, {
      cause: lastError instanceof Error ? lastError : undefined,
      suggestion: 'The operation may be temporarily unavailable. Try again later.'
    });
  }
  
  throw new InternalError('Retry loop completed without error or result');
}

/**
 * Recovery helper that provides fallback functionality
 */
export async function withFallback<T, F>(
  primary: () => Promise<T>,
  fallback: () => Promise<F>,
  options: {
    errorContext?: string;
    shouldUseFallback?: (error: unknown) => boolean;
  } = {}
): Promise<T | F> {
  const { errorContext, shouldUseFallback } = options;
  
  try {
    return await primary();
  } catch (error) {
    // Check if we should use fallback for this error
    if (shouldUseFallback && !shouldUseFallback(error)) {
      throw error;
    }
    
    // Don't use fallback for user-facing validation errors
    if (error instanceof ValidationError) {
      throw error;
    }
    
    try {
      return await fallback();
    } catch (fallbackError) {
      // If fallback fails, throw the original error
      throw error;
    }
  }
}

/**
 * Main entry point error handler for CLI commands
 */
export function createMainErrorHandler(options: ErrorOutputOptions = {}) {
  return (error: unknown): never => {
    handleError(error, { ...options, exit: true });
  };
}