/**
 * Validation helpers that throw appropriate errors for failed checks
 */

import { ValidationError } from '../errors/index.js';

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