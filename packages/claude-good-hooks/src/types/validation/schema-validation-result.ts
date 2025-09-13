import type { SchemaValidationError } from './schema-validation-error.js';

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}