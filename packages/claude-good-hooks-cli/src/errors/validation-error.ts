/**
 * Error for user input validation failures
 */
import { CommonErrorAttributes, createCommonErrorAttributes } from './common.js';
import { CLIError } from './cli-error.js';

export class ValidationError extends CLIError {
  public readonly name: string = 'ValidationError';

  constructor(
    message: string,
    options: {
      suggestion?: string;
      cause?: Error;
      context?: Record<string, any>;
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
    
    // Update the common attributes with the correct error code
    this.common = createCommonErrorAttributes('VALIDATION_ERROR', message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
      context: options.context,
    });
  }
}