/**
 * Error for command execution failures
 */
import { createCommonErrorAttributes } from './common.js';
import { CLIError } from './cli-error.js';

export class CommandError extends CLIError {
  public readonly name: string = 'CommandError';
  public readonly command?: string;
  public readonly stdout?: string;
  public readonly stderr?: string;

  constructor(
    message: string,
    options: {
      command?: string;
      stdout?: string;
      stderr?: string;
      exitCode?: number;
      suggestion?: string;
      cause?: Error;
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
        command: options.command,
        stdout: options.stdout,
        stderr: options.stderr,
      },
    });

    this.name = 'CommandError';

    // Override with the correct error code
    this.common = createCommonErrorAttributes('COMMAND_ERROR', message, this.common);

    this.command = options.command;
    this.stdout = options.stdout;
    this.stderr = options.stderr;
  }
}
