/**
 * Error for network-related operations
 */
import { CommonErrorAttributes, createCommonErrorAttributes } from './common.js';
import { CLIError } from './cli-error.js';

export class NetworkError extends CLIError {
  public readonly name: string = 'NetworkError';
  public readonly url?: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    options: {
      url?: string;
      statusCode?: number;
      suggestion?: string;
      cause?: Error;
      context?: Record<string, any>;
    } = {}
  ) {
    super(message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion || 'Check your internet connection and try again.',
      cause: options.cause,
      context: {
        ...options.context,
        url: options.url,
        statusCode: options.statusCode,
      },
    });
    
    this.name = 'NetworkError';
    
    // Update the common attributes with the correct error code
    this.common = createCommonErrorAttributes('NETWORK_ERROR', message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion || 'Check your internet connection and try again.',
      cause: options.cause,
      context: {
        ...options.context,
        url: options.url,
        statusCode: options.statusCode,
      },
    });
    
    this.url = options.url;
    this.statusCode = options.statusCode;
  }
}