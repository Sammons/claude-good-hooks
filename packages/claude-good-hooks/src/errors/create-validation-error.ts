export function createValidationError(message: string, field?: string): Error {
  const error = new Error(
    field ? `Validation error in field '${field}': ${message}` : `Validation error: ${message}`
  );
  error.name = 'ValidationError';
  return error;
}
