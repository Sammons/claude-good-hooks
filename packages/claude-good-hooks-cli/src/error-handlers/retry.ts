/**
 * Retry and recovery helpers for error-prone operations
 */

import { CLIError, ValidationError, InternalError, isCLIError } from '../errors/index.js';

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
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, shouldRetry, errorContext } = options;

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
      suggestion: 'The operation may be temporarily unavailable. Try again later.',
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
