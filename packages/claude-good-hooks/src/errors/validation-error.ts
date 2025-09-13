/**
 * Error for user input validation failures
 */
import { createCommonErrorAttributes } from './common.js';
import { CLIError } from './cli-error.js';

export class ValidationError extends CLIError {
  public override readonly name: string = 'ValidationError';

  constructor(
    message: string,
    options: {
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
      context: options.context,
    });

    this.name = 'ValidationError';

    // Override with the correct error code
    this.common = createCommonErrorAttributes('VALIDATION_ERROR', message, this.common);
  }
}
