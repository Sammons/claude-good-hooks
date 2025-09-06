/**
 * Apply help sub-command implementation
 */

import type { ApplySubCommand } from './apply-types.js';
import type { ApplyOptions } from './apply-options.js';
import type { ValidationResult } from '../common-validation-types.js';
import { showApplyHelp } from './apply-command-help.js';

export class ApplyHelpCommand implements ApplySubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ApplyOptions): boolean {
    // Match when help flag is set and no hook name provided, or when no args and no special flags
    return (Boolean(options.help) && args.length === 0) || 
           (args.length === 0 && !options.regenerate && !options.help);
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(_args: string[], options: ApplyOptions): ValidationResult<ApplyOptions> {
    // Apply help command is valid when help flag is set
    return {
      valid: true,
      result: options
    };
  }

  /**
   * Execute the apply help command
   */
  async execute(_args: string[], options: ApplyOptions): Promise<void> {
    const isJson = options.parent?.json;
    showApplyHelp(isJson);
  }
}