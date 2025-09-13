/**
 * Error for file system operations
 */
import { createCommonErrorAttributes } from './common.js';
import { CLIError } from './cli-error.js';

export class FileSystemError extends CLIError {
  public readonly name: string = 'FileSystemError';
  public readonly path?: string;
  public readonly operation?: string;

  constructor(
    message: string,
    options: {
      path?: string;
      operation?: string;
      suggestion?: string;
      cause?: Error;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
      context: {
        ...options.context,
        path: options.path,
        operation: options.operation,
      },
    });

    this.name = 'FileSystemError';

    // Override with the correct error code
    this.common = createCommonErrorAttributes('FILE_SYSTEM_ERROR', message, this.common);

    this.path = options.path;
    this.operation = options.operation;
  }
}
