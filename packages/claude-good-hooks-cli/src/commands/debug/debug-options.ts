/**
 * Options handling and validation for debug command
 */

import type { DebugOptions, ValidationResult } from './debug-types.js';

export class DebugOptionsHandler {
  /**
   * Validate debug command arguments and options
   */
  static validate(args: string[], options: DebugOptions): ValidationResult | boolean {
    // Allow help option
    if (options.help) {
      return true;
    }

    // Debug command accepts subcommands
    const validSubcommands = [
      'enable', 'disable', 'status', 'trace', 'profile', 
      'report', 'logs', 'analyze', 'breakpoint'
    ];

    if (args.length > 0 && !validSubcommands.includes(args[0]!)) {
      return {
        valid: false,
        errors: [`Invalid debug subcommand: ${args[0]}. Valid subcommands: ${validSubcommands.join(', ')}`]
      };
    }

    if (options.logLevel && !['debug', 'info', 'warn', 'error'].includes(options.logLevel)) {
      return {
        valid: false,
        errors: ['Invalid log level. Must be one of: debug, info, warn, error']
      };
    }

    return true;
  }

  /**
   * Get default options with proper typing
   */
  static getDefaults(): Partial<DebugOptions> {
    return {
      logLevel: 'info',
      interactive: false,
      json: false,
      trace: false,
      profile: false,
      breakpoint: false
    };
  }

  /**
   * Merge user options with defaults
   */
  static mergeOptions(userOptions: DebugOptions): DebugOptions {
    const defaults = this.getDefaults();
    return { ...defaults, ...userOptions };
  }
}