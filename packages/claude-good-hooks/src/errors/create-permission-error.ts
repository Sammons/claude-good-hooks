export function createPermissionError(message: string, path?: string): Error {
  const error = new Error(
    path ? `Permission error at '${path}': ${message}` : `Permission error: ${message}`
  );
  error.name = 'PermissionError';
  return error;
}
