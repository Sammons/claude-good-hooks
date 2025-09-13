import chalk from 'chalk';

/**
 * Enhanced error formatting with colors, error codes, and suggestions
 */

export enum ErrorCode {
  // General errors (1000-1999)
  UNKNOWN_ERROR = 1000,
  INVALID_ARGUMENT = 1001,
  MISSING_ARGUMENT = 1002,
  INVALID_OPTION = 1003,
  COMMAND_NOT_FOUND = 1004,

  // File system errors (2000-2999)
  FILE_NOT_FOUND = 2000,
  FILE_ACCESS_DENIED = 2001,
  DIRECTORY_NOT_FOUND = 2002,
  PATH_INVALID = 2003,
  FILE_ALREADY_EXISTS = 2004,

  // Configuration errors (3000-3999)
  CONFIG_NOT_FOUND = 3000,
  CONFIG_INVALID = 3001,
  CONFIG_PARSE_ERROR = 3002,
  SETTINGS_INVALID = 3003,
  HOOK_CONFIG_INVALID = 3004,

  // Hook errors (4000-4999)
  HOOK_NOT_FOUND = 4000,
  HOOK_EXECUTION_FAILED = 4001,
  HOOK_VALIDATION_FAILED = 4002,
  HOOK_DEPENDENCY_MISSING = 4003,
  HOOK_TEMPLATE_INVALID = 4004,

  NETWORK_ERROR = 5000,

  // Validation errors (6000-6999)
  VALIDATION_FAILED = 6000,
  SCHEMA_INVALID = 6001,
  TYPE_MISMATCH = 6002,
  CONSTRAINT_VIOLATION = 6003,

  // System errors (7000-7999)
  SYSTEM_ERROR = 7000,
  PERMISSION_DENIED = 7001,
  RESOURCE_UNAVAILABLE = 7002,
  DEPENDENCY_MISSING = 7003,
  VERSION_INCOMPATIBLE = 7004,
}

export interface ErrorSuggestion {
  title: string;
  description: string;
  command?: string;
  url?: string;
}

export interface EnhancedErrorOptions {
  code?: ErrorCode;
  cause?: Error;
  suggestions?: ErrorSuggestion[];
  context?: Record<string, unknown>;
  recoverable?: boolean;
  exitCode?: number;
}

/**
 * Enhanced error class with rich formatting and suggestions
 */
export class EnhancedError extends Error {
  public readonly code: ErrorCode;
  public override readonly cause?: Error;
  public readonly suggestions: ErrorSuggestion[];
  public readonly context: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly exitCode: number;

  constructor(message: string, options: EnhancedErrorOptions = {}) {
    super(message);
    this.name = 'EnhancedError';
    this.code = options.code || ErrorCode.UNKNOWN_ERROR;
    this.cause = options.cause;
    this.suggestions = options.suggestions || [];
    this.context = options.context || {};
    this.recoverable = options.recoverable !== false;
    this.exitCode = options.exitCode || this.getDefaultExitCode();

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, EnhancedError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedError);
    }
  }

  private getDefaultExitCode(): number {
    if (this.code >= 7000) return 3; // System errors
    if (this.code >= 6000) return 2; // Validation errors
    if (this.code >= 5000) return 4; // Network errors
    if (this.code >= 4000) return 5; // Hook errors
    if (this.code >= 3000) return 6; // Configuration errors
    if (this.code >= 2000) return 7; // File system errors
    return 1; // General errors
  }

  /**
   * Add a suggestion to the error
   */
  addSuggestion(suggestion: ErrorSuggestion): this {
    this.suggestions.push(suggestion);
    return this;
  }

  /**
   * Add context information to the error
   */
  addContext(key: string, value: unknown): this {
    this.context[key] = value;
    return this;
  }

  /**
   * Format the error for display
   */
  format(): string {
    return formatError(this);
  }
}

/**
 * Create common error types with predefined codes and suggestions
 */
export const createError = {
  fileNotFound: (path: string): EnhancedError =>
    new EnhancedError(`File not found: ${path}`, {
      code: ErrorCode.FILE_NOT_FOUND,
      context: { path },
      suggestions: [
        {
          title: 'Check the file path',
          description: 'Ensure the file exists and the path is correct',
        },
        {
          title: 'Use absolute path',
          description: 'Try using an absolute path instead of relative',
        },
      ],
    }),

  configNotFound: (configType: string): EnhancedError =>
    new EnhancedError(`${configType} configuration not found`, {
      code: ErrorCode.CONFIG_NOT_FOUND,
      context: { configType },
      suggestions: [
        {
          title: 'Create configuration manually',
          description: 'Create a .claude/settings.json file with hook configurations',
          command: 'mkdir -p .claude && echo "{}" > .claude/settings.json',
        },
        {
          title: 'Check documentation',
          description: 'See the documentation for configuration examples',
          url: 'https://docs.claude.ai/code/hooks',
        },
      ],
    }),

  hookNotFound: (hookName: string): EnhancedError =>
    new EnhancedError(`Hook not found: ${hookName}`, {
      code: ErrorCode.HOOK_NOT_FOUND,
      context: { hookName },
      suggestions: [
        {
          title: 'List available hooks',
          description: 'See all available hooks in your configuration',
          command: 'claude-good-hooks list-hooks',
        },
        {
          title: 'Check spelling',
          description: 'Verify the hook name is spelled correctly',
        },
        {
          title: 'Install hook',
          description: 'Ensure the hook module is installed locally or globally',
        },
      ],
    }),

  validationFailed: (details: string): EnhancedError =>
    new EnhancedError(`Validation failed: ${details}`, {
      code: ErrorCode.VALIDATION_FAILED,
      context: { details },
      suggestions: [
        {
          title: 'Run validation',
          description: 'Use the validate command to see detailed errors',
          command: 'claude-good-hooks validate --verbose',
        },
        {
          title: 'Fix automatically',
          description: 'Try auto-fixing common issues',
          command: 'claude-good-hooks validate --fix',
        },
      ],
    }),

  networkError: (url: string, cause?: Error): EnhancedError =>
    new EnhancedError(`Network error accessing: ${url}`, {
      code: ErrorCode.NETWORK_ERROR,
      cause,
      context: { url },
      suggestions: [
        {
          title: 'Check internet connection',
          description: 'Ensure you have a stable internet connection',
        },
        {
          title: 'Verify URL',
          description: 'Check if the URL is correct and accessible',
        },
        {
          title: 'Try again later',
          description: 'The service might be temporarily unavailable',
        },
      ],
    }),

  permissionDenied: (resource: string): EnhancedError =>
    new EnhancedError(`Permission denied: ${resource}`, {
      code: ErrorCode.PERMISSION_DENIED,
      context: { resource },
      suggestions: [
        {
          title: 'Check permissions',
          description: 'Ensure you have the necessary permissions',
        },
        {
          title: 'Run as administrator',
          description: 'Try running the command with elevated permissions',
        },
        {
          title: 'Change ownership',
          description: 'You may need to change file or directory ownership',
        },
      ],
    }),
};

/**
 * Format an error for display with colors and suggestions
 */
export function formatError(error: Error | EnhancedError): string {
  const output: string[] = [];

  if (error instanceof EnhancedError) {
    // Error header with code
    output.push(chalk.red.bold('✗ Error'));
    if (error.code) {
      output.push(chalk.gray(`[${error.code}] `));
    }
    output.push(error.message);
    output.push('\n');

    // Context information
    if (Object.keys(error.context).length > 0) {
      output.push(chalk.gray('Context:\n'));
      for (const [key, value] of Object.entries(error.context)) {
        output.push(chalk.gray(`  ${key}: ${JSON.stringify(value)}\n`));
      }
      output.push('\n');
    }

    // Cause chain
    if (error.cause) {
      output.push(chalk.gray('Caused by:\n'));
      output.push(chalk.gray(`  ${error.cause.message}\n`));
      output.push('\n');
    }

    // Suggestions
    if (error.suggestions.length > 0) {
      output.push(chalk.yellow.bold('💡 Suggestions:\n'));
      error.suggestions.forEach((suggestion, index) => {
        output.push(chalk.yellow(`${index + 1}. ${suggestion.title}\n`));
        output.push(chalk.gray(`   ${suggestion.description}\n`));

        if (suggestion.command) {
          output.push(chalk.cyan(`   Run: ${suggestion.command}\n`));
        }

        if (suggestion.url) {
          output.push(chalk.blue(`   See: ${suggestion.url}\n`));
        }

        output.push('\n');
      });
    }

    // Stack trace in debug mode
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      output.push(chalk.gray('Stack trace:\n'));
      output.push(chalk.gray(error.stack || 'No stack trace available'));
      output.push('\n');
    }
  } else {
    // Basic error formatting
    output.push(chalk.red.bold('✗ Error: '));
    output.push(error.message);
    output.push('\n');

    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      output.push(chalk.gray(error.stack || ''));
      output.push('\n');
    }
  }

  return output.join('');
}

/**
 * Handle and display errors consistently
 */
export function handleError(error: Error | EnhancedError, exitOnError = true): void {
  const formattedError = formatError(error);
  console.error(formattedError);

  if (exitOnError) {
    const exitCode = error instanceof EnhancedError ? error.exitCode : 1;
    process.exit(exitCode);
  }
}

/**
 * Wrap an async function to handle errors consistently
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(new EnhancedError(String(error)));
      }
      throw error; // This won't be reached due to process.exit, but satisfies TypeScript
    }
  };
}

/**
 * Convert a regular error to an enhanced error
 */
export function enhanceError(error: Error, options: EnhancedErrorOptions = {}): EnhancedError {
  if (error instanceof EnhancedError) {
    return error;
  }

  return new EnhancedError(error.message, {
    ...options,
    cause: error,
  });
}

/**
 * Create error from common patterns
 */
export function createCommonErrors(
  pattern: string,
  context: Record<string, unknown> = {}
): EnhancedError {
  switch (pattern) {
    case 'ENOENT':
      return createError.fileNotFound(String(context.path || 'unknown'));

    case 'EACCES':
      return createError.permissionDenied(String(context.path || 'resource'));

    case 'ENOTDIR':
      return new EnhancedError('Path is not a directory', {
        code: ErrorCode.PATH_INVALID,
        context,
      });

    case 'EISDIR':
      return new EnhancedError('Path is a directory, expected a file', {
        code: ErrorCode.PATH_INVALID,
        context,
      });

    default:
      return new EnhancedError(`System error: ${pattern}`, {
        code: ErrorCode.SYSTEM_ERROR,
        context,
      });
  }
}

/**
 * Utility to check if error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  return error instanceof EnhancedError && error.recoverable;
}

/**
 * Utility to get error code from error
 */
export function getErrorCode(error: Error): ErrorCode {
  return error instanceof EnhancedError ? error.code : ErrorCode.UNKNOWN_ERROR;
}
