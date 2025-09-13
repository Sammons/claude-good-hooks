/**
 * Safe execution wrappers that convert non-CLI errors to appropriate CLI errors
 */

import { AppError, ERROR_CODES, isAppError } from '../errors/app-error.js';

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
    if (isAppError(error)) {
      throw error;
    }

    // Convert unknown errors to CLI errors with context
    const message = error instanceof Error ? error.message : String(error);
    const contextualMessage = errorContext ? `${errorContext}: ${message}` : message;

    throw new AppError(contextualMessage, {
      code: ERROR_CODES.UNKNOWN,
      cause: error instanceof Error ? error : undefined,
      suggestion: 'If this problem persists, please report it as a bug.',
    });
  }
}

/**
 * Safe sync execution wrapper
 */
export function safeSyncExecute<T>(operation: () => T, errorContext?: string): T {
  try {
    return operation();
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    // Convert unknown errors to CLI errors with context
    const message = error instanceof Error ? error.message : String(error);
    const contextualMessage = errorContext ? `${errorContext}: ${message}` : message;

    throw new AppError(contextualMessage, {
      code: ERROR_CODES.UNKNOWN,
      cause: error instanceof Error ? error : undefined,
      suggestion: 'If this problem persists, please report it as a bug.',
    });
  }
}
