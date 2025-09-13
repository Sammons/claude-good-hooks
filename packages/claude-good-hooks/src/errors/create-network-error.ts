export function createNetworkError(message: string, url?: string, statusCode?: number): Error {
  let errorMessage = `Network error: ${message}`;
  if (url) {
    errorMessage += ` (URL: ${url})`;
  }
  if (statusCode !== undefined) {
    errorMessage += ` (status: ${statusCode})`;
  }

  const error = new Error(errorMessage);
  error.name = 'NetworkError';
  return error;
}
