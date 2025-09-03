/**
 * Error for configuration-related issues
 */
import { CommonErrorAttributes, createCommonErrorAttributes } from './common.js';
import { CLIError } from './cli-error.js';

export class ConfigError extends CLIError {
  public readonly name: string = 'ConfigError';
  public readonly configPath?: string;
  public readonly configKey?: string;

  constructor(
    message: string,
    options: {
      configPath?: string;
      configKey?: string;
      suggestion?: string;
      cause?: Error;
      context?: Record<string, any>;
    } = {}
  ) {
    super(message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
      context: {
        ...options.context,
        configPath: options.configPath,
        configKey: options.configKey,
      },
    });
    
    this.name = 'ConfigError';
    
    // Update the common attributes with the correct error code
    this.common = createCommonErrorAttributes('CONFIG_ERROR', message, {
      exitCode: 1,
      isUserFacing: true,
      suggestion: options.suggestion,
      cause: options.cause,
      context: {
        ...options.context,
        configPath: options.configPath,
        configKey: options.configKey,
      },
    });
    
    this.configPath = options.configPath;
    this.configKey = options.configKey;
  }
}