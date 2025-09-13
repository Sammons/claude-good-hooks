export function createFileError(message: string, path?: string): Error {
  const error = new Error(path ? `File error at '${path}': ${message}` : `File error: ${message}`);
  error.name = 'FileError';
  return error;
}