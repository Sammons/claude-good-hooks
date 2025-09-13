export function createCommandError(message: string, command?: string, exitCode?: number): Error {
  let errorMessage = `Command error: ${message}`;
  if (command) {
    errorMessage += ` (command: ${command})`;
  }
  if (exitCode !== undefined) {
    errorMessage += ` (exit code: ${exitCode})`;
  }

  const error = new Error(errorMessage);
  error.name = 'CommandError';
  return error;
}
