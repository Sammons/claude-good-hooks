/**
 * Validation helpers that throw appropriate errors for failed checks
 */

import { AppError, ERROR_CODES } from '../errors/app-error.js';

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
    throw new AppError(`Invalid ${fieldName}`, {
      code: ERROR_CODES.VALIDATION_FAILED,
      suggestion
    });
  }

  if (typeof result === 'string') {
    throw new AppError(`Invalid ${fieldName}: ${result}`, {
      code: ERROR_CODES.VALIDATION_FAILED,
      suggestion
    });
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
    throw new AppError(message, {
      code: ERROR_CODES.VALIDATION_FAILED,
      suggestion
    });
  }
}
