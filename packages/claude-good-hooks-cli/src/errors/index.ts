/**
 * Custom error classes for claude-good-hooks CLI
 */

/**
 * Base class for all CLI errors
 */
export class CLIError extends Error {
  /**
   * Exit code for the CLI process
   */
  public readonly exitCode: number;
  
  /**
   * Whether this error should be formatted in JSON output
   */
  public readonly isUserFacing: boolean;
  
  /**
   * Optional actionable advice for the user
   */
  public readonly suggestion?: string;

  constructor(
    message: string,
    options: {
      exitCode?: number;
      isUserFacing?: boolean;
      suggestion?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.exitCode = options.exitCode ?? 1;
    this.isUserFacing = options.isUserFacing ?? true;
    this.suggestion = options.suggestion;
    
    if (options.cause) {
      this.cause = options.cause;
    }
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error for user input validation failures
 */
export class ValidationError extends CLIError {
  constructor(
    message: string,
    options: {
      suggestion?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
    });
  }
}

/**
 * Error for configuration-related issues
 */
export class ConfigError extends CLIError {
  public readonly configPath?: string;
  public readonly configKey?: string;

  constructor(
    message: string,
    options: {
      configPath?: string;
      configKey?: string;
      suggestion?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
    });
    
    this.configPath = options.configPath;
    this.configKey = options.configKey;
  }
}

/**
 * Error for hook plugin loading or execution failures
 */
export class HookError extends CLIError {
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
    } = {}
  ) {
    super(message, {
      exitCode: options.exitCode ?? 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
    });
    
    this.hookName = options.hookName;
    this.hookPath = options.hookPath;
  }
}

/**
 * Error for network-related operations
 */
export class NetworkError extends CLIError {
  public readonly url?: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    options: {
      url?: string;
      statusCode?: number;
      suggestion?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion || 'Check your internet connection and try again.',
      cause: options.cause,
    });
    
    this.url = options.url;
    this.statusCode = options.statusCode;
  }
}

/**
 * Error for file system operations
 */
export class FileSystemError extends CLIError {
  public readonly path?: string;
  public readonly operation?: string;

  constructor(
    message: string,
    options: {
      path?: string;
      operation?: string;
      suggestion?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
    });
    
    this.path = options.path;
    this.operation = options.operation;
  }
}

/**
 * Error for permission-related issues
 */
export class PermissionError extends CLIError {
  public readonly path?: string;
  public readonly requiredPermission?: string;

  constructor(
    message: string,
    options: {
      path?: string;
      requiredPermission?: string;
      suggestion?: string;
      cause?: Error;
    } = {}
  ) {
    const defaultSuggestion = options.path
      ? `Check file permissions for ${options.path} or run with appropriate privileges.`
      : 'Check file permissions or run with appropriate privileges.';
      
    super(message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion || defaultSuggestion,
      cause: options.cause,
    });
    
    this.path = options.path;
    this.requiredPermission = options.requiredPermission;
  }
}

/**
 * Error for command execution failures
 */
export class CommandError extends CLIError {
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
    } = {}
  ) {
    super(message, {
      exitCode: options.exitCode ?? 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
    });
    
    this.command = options.command;
    this.stdout = options.stdout;
    this.stderr = options.stderr;
  }
}

/**
 * Internal error for unexpected conditions (not user-facing)
 */
export class InternalError extends CLIError {
  constructor(
    message: string,
    options: {
      cause?: Error;
      exitCode?: number;
    } = {}
  ) {
    super(`Internal error: ${message}`, {
      exitCode: options.exitCode ?? 1,
      isUserFacing: false,
      suggestion: 'This appears to be a bug in claude-good-hooks. Please report this issue.',
      cause: options.cause,
    });
  }
}

/**
 * Type guard to check if an error is a CLI error
 */
export function isCLIError(error: unknown): error is CLIError {
  return error instanceof CLIError;
}

/**
 * Type guard to check if an error has suggestion property
 */
export function hasErrorSuggestion(error: unknown): error is CLIError & { suggestion: string } {
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

export function formatError(error: unknown, options: ErrorOutputOptions = {}): string {
  const { isJson = false, showStackTrace = false, includeDetails = false } = options;
  
  if (isCLIError(error)) {
    if (isJson) {
      const errorObj: any = {
        success: false,
        error: error.message,
        errorType: error.constructor.name,
        exitCode: error.exitCode,
      };
      
      if (error.suggestion) {
        errorObj.suggestion = error.suggestion;
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
      }
      
      if (showStackTrace && error.stack) {
        errorObj.stack = error.stack;
      }
      
      return JSON.stringify(errorObj);
    } else {
      // Console output
      let output = `Error: ${error.message}`;
      
      if (error.suggestion) {
        output += `\n💡 Suggestion: ${error.suggestion}`;
      }
      
      if (showStackTrace && error.stack) {
        output += `\n\nStack trace:\n${error.stack}`;
      }
      
      return output;
    }
  }
  
  // Handle non-CLI errors
  const message = error instanceof Error ? error.message : String(error);
  
  if (isJson) {
    const errorObj: any = {
      success: false,
      error: message,
      errorType: 'UnknownError',
      exitCode: 1,
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