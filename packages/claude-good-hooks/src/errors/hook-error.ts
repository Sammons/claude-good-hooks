/**
 * Error for hook plugin loading or execution failures
 */
import { createCommonErrorAttributes } from './common.js';
import { CLIError } from './cli-error.js';

export class HookError extends CLIError {
  public readonly name: string = 'HookError';
  public readonly hookName?: string;
  public readonly hookPath?: string;

  constructor(
    message: string,
    options: {
      hookName?: string;
      hookPath?: string;
      suggestion?: string;
      cause?: Error;
      exitCode?: number;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message, {
      exitCode: options.exitCode ?? 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
      context: {
        ...options.context,
        hookName: options.hookName,
        hookPath: options.hookPath,
      },
    });

    this.name = 'HookError';

    // Override with the correct error code
    this.common = createCommonErrorAttributes('HOOK_ERROR', message, this.common);

    this.hookName = options.hookName;
    this.hookPath = options.hookPath;
  }
}
