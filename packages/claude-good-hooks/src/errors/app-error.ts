/**
 * Unified error class for the claude-good-hooks CLI
 * Uses error codes to differentiate between error types
 */

// Define all possible error codes as a const assertion for type safety
export const ERROR_CODES = {
  // General errors
  UNKNOWN: 'UNKNOWN',
  INTERNAL: 'INTERNAL',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  MISSING_ARGUMENT: 'MISSING_ARGUMENT',
  INVALID_TYPE: 'INVALID_TYPE',

  // Configuration errors
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_PERMISSION_DENIED: 'CONFIG_PERMISSION_DENIED',
  CONFIG_WRITE_FAILED: 'CONFIG_WRITE_FAILED',

  // Hook errors
  HOOK_NOT_FOUND: 'HOOK_NOT_FOUND',
  HOOK_LOAD_FAILED: 'HOOK_LOAD_FAILED',
  HOOK_EXECUTION_FAILED: 'HOOK_EXECUTION_FAILED',
  HOOK_INVALID: 'HOOK_INVALID',
  HOOK_ALREADY_EXISTS: 'HOOK_ALREADY_EXISTS',

  // Module errors
  MODULE_NOT_INSTALLED: 'MODULE_NOT_INSTALLED',
  MODULE_LOAD_FAILED: 'MODULE_LOAD_FAILED',
  MODULE_INVALID: 'MODULE_INVALID',
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',

  // File system errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_FAILED: 'FILE_READ_FAILED',
  FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',
  DIRECTORY_CREATE_FAILED: 'DIRECTORY_CREATE_FAILED',
  PATH_NOT_ABSOLUTE: 'PATH_NOT_ABSOLUTE',
  FILESYSTEM_OPERATION_FAILED: 'FILESYSTEM_OPERATION_FAILED',

  // Permission errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Command errors
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  COMMAND_FAILED: 'COMMAND_FAILED',
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT',
  COMMAND_EXECUTION_FAILED: 'COMMAND_EXECUTION_FAILED',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_REQUEST_FAILED: 'NETWORK_REQUEST_FAILED',

  // General timeout
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Default exit codes for different error categories
 */
const EXIT_CODES: Record<ErrorCode, number> = {
  // General errors
  [ERROR_CODES.UNKNOWN]: 1,
  [ERROR_CODES.INTERNAL]: 99,

  // Validation errors - exit code 2
  [ERROR_CODES.VALIDATION_FAILED]: 2,
  [ERROR_CODES.INVALID_ARGUMENT]: 2,
  [ERROR_CODES.MISSING_ARGUMENT]: 2,
  [ERROR_CODES.INVALID_TYPE]: 2,

  // Configuration errors - exit code 3
  [ERROR_CODES.CONFIG_NOT_FOUND]: 3,
  [ERROR_CODES.CONFIG_INVALID]: 3,
  [ERROR_CODES.CONFIG_PERMISSION_DENIED]: 3,
  [ERROR_CODES.CONFIG_WRITE_FAILED]: 3,

  // Hook errors - exit code 4
  [ERROR_CODES.HOOK_NOT_FOUND]: 4,
  [ERROR_CODES.HOOK_LOAD_FAILED]: 4,
  [ERROR_CODES.HOOK_EXECUTION_FAILED]: 4,
  [ERROR_CODES.HOOK_INVALID]: 4,
  [ERROR_CODES.HOOK_ALREADY_EXISTS]: 4,

  // Module errors - exit code 5
  [ERROR_CODES.MODULE_NOT_INSTALLED]: 5,
  [ERROR_CODES.MODULE_LOAD_FAILED]: 5,
  [ERROR_CODES.MODULE_INVALID]: 5,
  [ERROR_CODES.MODULE_NOT_FOUND]: 5,

  // File system errors - exit code 6
  [ERROR_CODES.FILE_NOT_FOUND]: 6,
  [ERROR_CODES.FILE_READ_FAILED]: 6,
  [ERROR_CODES.FILE_WRITE_FAILED]: 6,
  [ERROR_CODES.DIRECTORY_CREATE_FAILED]: 6,
  [ERROR_CODES.PATH_NOT_ABSOLUTE]: 6,
  [ERROR_CODES.FILESYSTEM_OPERATION_FAILED]: 6,

  // Permission errors - exit code 7
  [ERROR_CODES.PERMISSION_DENIED]: 7,
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 7,

  // Command errors - exit code 8
  [ERROR_CODES.COMMAND_NOT_FOUND]: 8,
  [ERROR_CODES.COMMAND_FAILED]: 8,
  [ERROR_CODES.COMMAND_TIMEOUT]: 8,
  [ERROR_CODES.COMMAND_EXECUTION_FAILED]: 8,

  // Network errors - exit code 9
  [ERROR_CODES.NETWORK_ERROR]: 9,
  [ERROR_CODES.NETWORK_TIMEOUT]: 9,
  [ERROR_CODES.NETWORK_REQUEST_FAILED]: 9,

  // General timeout - exit code 10
  [ERROR_CODES.TIMEOUT]: 10,
};

export interface AppErrorOptions {
  code?: ErrorCode;
  exitCode?: number;
  suggestion?: string;
  cause?: Error;
  details?: Record<string, unknown>;
  context?: Record<string, unknown>;
  isUserFacing?: boolean;
  // For specific error types
  configPath?: string;
  configKey?: string;
  hookName?: string;
  hookPath?: string;
  path?: string;
  operation?: string;
  url?: string;
  statusCode?: number;
  command?: string;
  stdout?: string;
  stderr?: string;
}

/**
 * Unified application error class
 * All errors in the application should use this class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly exitCode: number;
  public readonly suggestion?: string;
  public override readonly cause?: Error;
  public readonly details?: Record<string, unknown>;
  public readonly context?: Record<string, unknown>;
  public readonly isUserFacing: boolean;
  public readonly timestamp: Date;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';

    this.code = options.code ?? ERROR_CODES.UNKNOWN;
    this.exitCode = options.exitCode ?? EXIT_CODES[this.code] ?? 1;
    this.suggestion = options.suggestion;
    this.cause = options.cause;
    this.details = options.details;
    this.context = options.context || this.buildContext(options);
    this.isUserFacing = options.isUserFacing ?? true;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Build context from specific options
   * @internal
   */
  public buildContext(options: AppErrorOptions): Record<string, unknown> | undefined {
    const context: Record<string, unknown> = {};
    let hasContext = false;

    if (options.configPath) {
      context.configPath = options.configPath;
      hasContext = true;
    }
    if (options.configKey) {
      context.configKey = options.configKey;
      hasContext = true;
    }
    if (options.hookName) {
      context.hookName = options.hookName;
      hasContext = true;
    }
    if (options.hookPath) {
      context.hookPath = options.hookPath;
      hasContext = true;
    }
    if (options.path) {
      context.path = options.path;
      hasContext = true;
    }
    if (options.operation) {
      context.operation = options.operation;
      hasContext = true;
    }
    if (options.url) {
      context.url = options.url;
      hasContext = true;
    }
    if (options.statusCode !== undefined) {
      context.statusCode = options.statusCode;
      hasContext = true;
    }
    if (options.command) {
      context.command = options.command;
      hasContext = true;
    }
    if (options.stdout) {
      context.stdout = options.stdout;
      hasContext = true;
    }
    if (options.stderr) {
      context.stderr = options.stderr;
      hasContext = true;
    }

    return hasContext ? context : undefined;
  }

  /**
   * Create a validation error
   */
  static validation(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.VALIDATION_FAILED,
    });
  }

  /**
   * Create a config error
   */
  static config(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.CONFIG_INVALID,
    });
  }

  /**
   * Create a hook error
   */
  static hook(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.HOOK_EXECUTION_FAILED,
    });
  }

  /**
   * Create a file system error
   */
  static filesystem(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.FILESYSTEM_OPERATION_FAILED,
    });
  }

  /**
   * Create a permission error
   */
  static permission(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    // Auto-add suggestion if path is provided, otherwise provide default
    const suggestion = options.path
      ? `Check file permissions for ${options.path}`
      : options.suggestion || 'Check your permissions and try again';

    return new AppError(message, {
      ...options,
      suggestion,
      code: ERROR_CODES.PERMISSION_DENIED,
    });
  }

  /**
   * Create a command error
   */
  static command(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.COMMAND_EXECUTION_FAILED,
    });
  }

  /**
   * Create a module error
   */
  static module(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(message, {
      ...options,
      code: ERROR_CODES.MODULE_NOT_FOUND,
    });
  }

  /**
   * Create a network error
   */
  static network(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(message, {
      ...options,
      suggestion: options.suggestion || 'Check your internet connection and try again.',
      code: ERROR_CODES.NETWORK_REQUEST_FAILED,
    });
  }

  /**
   * Create an internal error
   */
  static internal(message: string, options: Omit<AppErrorOptions, 'code'> = {}): AppError {
    return new AppError(`Internal error: ${message}`, {
      ...options,
      code: ERROR_CODES.INTERNAL,
      isUserFacing: false,
      suggestion:
        options.suggestion || 'This is likely a bug in claude-good-hooks. Please report it.',
    });
  }

  /**
   * Convert to JSON for structured output
   */
  toJSON(): Record<string, unknown> {
    return {
      success: false,
      error: this.message,
      code: this.code,
      exitCode: this.exitCode,
      timestamp: this.timestamp,
      ...(this.suggestion && { suggestion: this.suggestion }),
      ...(this.details && { details: this.details }),
      ...(this.stack && { stack: this.stack }),
    };
  }

  /**
   * Format for console output
   */
  override toString(): string {
    let output = `Error: ${this.message}`;

    if (this.code !== ERROR_CODES.UNKNOWN) {
      output += ` (${this.code})`;
    }

    if (this.suggestion) {
      output += `\n💡 Suggestion: ${this.suggestion}`;
    }

    return output;
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Format any error for output
 */
export function formatError(
  error: unknown,
  options: { json?: boolean; isJson?: boolean; showStackTrace?: boolean; includeStack?: boolean; includeDetails?: boolean; context?: Record<string, unknown> } = {}
): string {
  // Handle legacy option names for backward compatibility
  const isJson = options.json ?? options.isJson;
  const showStackTrace = options.includeStack ?? options.showStackTrace;

  if (isAppError(error)) {
    if (isJson) {
      const output: Record<string, unknown> = {
        success: false,
        message: error.message,
        name: 'AppError',
        errorCode: error.code,
        exitCode: error.exitCode,
      };

      if (error.suggestion) {
        output.suggestion = error.suggestion;
      }

      if (options.includeDetails && error.context) {
        output.context = error.context;
      }

      if (options.context) {
        output.context = options.context;
      }

      if (showStackTrace && error.stack) {
        output.stack = error.stack;
      }

      return JSON.stringify(output);
    }

    let output = error.toString();
    if (showStackTrace && error.stack) {
      output += `\n\nStack trace:\n${error.stack}`;
    }
    return output;
  }

  // Handle non-AppError errors
  const message = error instanceof Error ? error.message : String(error);

  if (isJson) {
    const output: Record<string, unknown> = {
      success: false,
      message: message,
      name: 'Error',
      exitCode: 1,
    };

    if (showStackTrace && error instanceof Error && error.stack) {
      output.stack = error.stack;
    }

    return JSON.stringify(output);
  }

  let output = `Error: ${message}`;
  if (showStackTrace && error instanceof Error && error.stack) {
    output += `\n\nStack trace:\n${error.stack}`;
  }
  return output;
}
