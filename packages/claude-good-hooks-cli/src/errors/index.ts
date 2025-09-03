/**
 * Error handling system for claude-good-hooks CLI using composition pattern
 */

// Export all error types
export { CLIError } from './cli-error.js';
export { ValidationError } from './validation-error.js';
export { ConfigError } from './config-error.js';
export { HookError } from './hook-error.js';
export { NetworkError } from './network-error.js';
export { FileSystemError } from './file-system-error.js';
export { PermissionError } from './permission-error.js';
export { CommandError } from './command-error.js';
export { InternalError } from './internal-error.js';

// Import for type definitions
import type { CLIError } from './cli-error.js';
import type { ValidationError } from './validation-error.js';
import type { ConfigError } from './config-error.js';
import type { HookError } from './hook-error.js';
import type { NetworkError } from './network-error.js';
import type { FileSystemError } from './file-system-error.js';
import type { PermissionError } from './permission-error.js';
import type { CommandError } from './command-error.js';
import type { InternalError } from './internal-error.js';

// Export common types and utilities
export { CommonErrorAttributes, createCommonErrorAttributes } from './common.js';

// Type that represents any CLI error with composition pattern
export type AnyCLIError =
  | CLIError
  | ValidationError
  | ConfigError
  | HookError
  | NetworkError
  | FileSystemError
  | PermissionError
  | CommandError
  | InternalError;

/**
 * Type guard to check if an error is a CLI error (using composition pattern)
 */
export function isCLIError(error: unknown): error is AnyCLIError {
  return (
    error != null &&
    typeof error === 'object' &&
    'common' in error &&
    error.common != null &&
    typeof error.common === 'object' &&
    'code' in error.common &&
    'message' in error.common &&
    'exitCode' in error.common &&
    'isUserFacing' in error.common
  );
}

/**
 * Type guard to check if an error has suggestion property
 */
export function hasErrorSuggestion(error: unknown): error is AnyCLIError & { suggestion: string } {
  return isCLIError(error) && typeof error.suggestion === 'string' && error.suggestion.length > 0;
}

/**
 * Format error for output (console or JSON)
 */
export interface ErrorOutputOptions {
  isJson?: boolean;
  showStackTrace?: boolean;
  includeDetails?: boolean;
}

interface FormattedErrorOutput {
  success: boolean;
  error: string;
  errorType: string;
  errorCode?: string;
  exitCode: number;
  timestamp: Date;
  suggestion?: string;
  configPath?: string;
  configKey?: string;
  hookName?: string;
  hookPath?: string;
  url?: string;
  statusCode?: number;
  path?: string;
  operation?: string;
  requiredPermission?: string;
  command?: string;
  stdout?: string;
  stderr?: string;
  context?: Record<string, unknown>;
  stack?: string;
}

export function formatError(error: unknown, options: ErrorOutputOptions = {}): string {
  const { isJson = false, showStackTrace = false, includeDetails = false } = options;

  if (isCLIError(error)) {
    if (isJson) {
      const errorObj: FormattedErrorOutput = {
        success: false,
        error: error.common.message,
        errorType: error.constructor.name,
        errorCode: error.common.code,
        exitCode: error.common.exitCode,
        timestamp: error.common.timestamp,
      };

      if (error.common.suggestion) {
        errorObj.suggestion = error.common.suggestion;
      }

      if (includeDetails) {
        // Add type-specific details
        if (error instanceof ConfigError) {
          if (error.configPath) errorObj.configPath = error.configPath;
          if (error.configKey) errorObj.configKey = error.configKey;
        } else if (error instanceof HookError) {
          if (error.hookName) errorObj.hookName = error.hookName;
          if (error.hookPath) errorObj.hookPath = error.hookPath;
        } else if (error instanceof NetworkError) {
          if (error.url) errorObj.url = error.url;
          if (error.statusCode) errorObj.statusCode = error.statusCode;
        } else if (error instanceof FileSystemError) {
          if (error.path) errorObj.path = error.path;
          if (error.operation) errorObj.operation = error.operation;
        } else if (error instanceof PermissionError) {
          if (error.path) errorObj.path = error.path;
          if (error.requiredPermission) errorObj.requiredPermission = error.requiredPermission;
        } else if (error instanceof CommandError) {
          if (error.command) errorObj.command = error.command;
          if (error.stdout) errorObj.stdout = error.stdout;
          if (error.stderr) errorObj.stderr = error.stderr;
        }

        // Add context if available
        if (error.common.context) {
          errorObj.context = error.common.context;
        }
      }

      if (showStackTrace && error.common.stack) {
        errorObj.stack = error.common.stack;
      }

      return JSON.stringify(errorObj);
    } else {
      // Console output
      let output = `Error: ${error.common.message}`;

      if (error.common.suggestion) {
        output += `\n💡 Suggestion: ${error.common.suggestion}`;
      }

      if (showStackTrace && error.common.stack) {
        output += `\n\nStack trace:\n${error.common.stack}`;
      }

      return output;
    }
  }

  // Handle non-CLI errors
  const message = error instanceof Error ? error.message : String(error);

  if (isJson) {
    const errorObj: FormattedErrorOutput = {
      success: false,
      error: message,
      errorType: 'UnknownError',
      exitCode: 1,
      timestamp: new Date(),
    };

    if (showStackTrace && error instanceof Error && error.stack) {
      errorObj.stack = error.stack;
    }

    return JSON.stringify(errorObj);
  } else {
    let output = `Error: ${message}`;

    if (showStackTrace && error instanceof Error && error.stack) {
      output += `\n\nStack trace:\n${error.stack}`;
    }

    return output;
  }
}
