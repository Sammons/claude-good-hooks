/**
 * Error for permission-related issues
 */
import { CommonErrorAttributes, createCommonErrorAttributes } from './common.js';
import { CLIError } from './cli-error.js';

export class PermissionError extends CLIError {
  public readonly name: string = 'PermissionError';
  public readonly path?: string;
  public readonly requiredPermission?: string;

  constructor(
    message: string,
    options: {
      path?: string;
      requiredPermission?: string;
      suggestion?: string;
      cause?: Error;
      context?: Record<string, any>;
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
      context: {
        ...options.context,
        path: options.path,
        requiredPermission: options.requiredPermission,
      },
    });
    
    this.name = 'PermissionError';
    
    // Update the common attributes with the correct error code
    this.common = createCommonErrorAttributes('PERMISSION_ERROR', message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion || defaultSuggestion,
      cause: options.cause,
      context: {
        ...options.context,
        path: options.path,
        requiredPermission: options.requiredPermission,
      },
    });
    
    this.path = options.path;
    this.requiredPermission = options.requiredPermission;
  }
}