/**
 * Generic CLI error class for backward compatibility and general errors
 */
import { CommonErrorAttributes, createCommonErrorAttributes } from './common.js';

export class CLIError extends Error {
  public readonly common: CommonErrorAttributes;
  public readonly name: string = 'CLIError';

  constructor(
    message: string,
    options: {
      exitCode?: number;
      isUserFacing?: boolean;
      suggestion?: string;
      cause?: Error;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message);
    this.name = 'CLIError';

    this.common = createCommonErrorAttributes('CLI_ERROR', message, {
      exitCode: options.exitCode ?? 1,
      isUserFacing: options.isUserFacing ?? true,
      suggestion: options.suggestion,
      cause: options.cause,
      context: options.context,
    });

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Convenience getters to maintain backward compatibility
  get exitCode(): number {
    return this.common.exitCode;
  }
  get isUserFacing(): boolean {
    return this.common.isUserFacing;
  }
  get suggestion(): string | undefined {
    return this.common.suggestion;
  }
  get cause(): Error | undefined {
    return this.common.cause;
  }
}
