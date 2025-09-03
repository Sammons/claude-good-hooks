/**
 * Internal error for unexpected conditions (not user-facing)
 */
import { CommonErrorAttributes, createCommonErrorAttributes } from './common.js';
import { CLIError } from './cli-error.js';

export class InternalError extends CLIError {
  public readonly name: string = 'InternalError';

  constructor(
    message: string,
    options: {
      cause?: Error;
      exitCode?: number;
      context?: Record<string, any>;
    } = {}
  ) {
    super(`Internal error: ${message}`, {
      exitCode: options.exitCode ?? 1,
      isUserFacing: false,
      suggestion: 'This appears to be a bug in claude-good-hooks. Please report this issue.',
      cause: options.cause,
      context: options.context,
    });
    
    this.name = 'InternalError';
    
    // Update the common attributes with the correct error code
    this.common = createCommonErrorAttributes('INTERNAL_ERROR', `Internal error: ${message}`, {
      exitCode: options.exitCode ?? 1,
      isUserFacing: false,
      suggestion: 'This appears to be a bug in claude-good-hooks. Please report this issue.',
      cause: options.cause,
      context: options.context,
    });
  }
}