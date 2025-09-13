/**
 * Validate help sub-command implementation
 */

import type { ValidateSubCommand } from './validate-types.js';
import type { ValidateOptions } from './validate-options.js';
import type { ValidationResult } from '../common-validation-types.js';
import { showValidateHelp } from './validate-command-help.js';

export class ValidateHelpCommand implements ValidateSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ValidateOptions): boolean {
    // Match when help flag is set
    return Boolean(options.help);
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: ValidateOptions): ValidationResult<ValidateOptions> {
    // Validate help command is always valid when help flag is set
    return {
      valid: true,
      result: options,
    };
  }

  /**
   * Execute the validate help command
   */
  async execute(args: string[], options: ValidateOptions): Promise<void> {
    const isJson = options.parent?.json;
    showValidateHelp(isJson);
  }
}
