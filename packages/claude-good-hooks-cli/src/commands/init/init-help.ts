/**
 * Init help sub-command implementation
 */

import type { InitSubCommand } from './init-types.js';
import type { InitOptions } from './init-options.js';
import type { ValidationResult } from '../common-validation-types.js';
import { showInitHelp } from './init-command-help.js';

export class InitHelpCommand implements InitSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(_args: string[], options: InitOptions): boolean {
    // Match when help flag is set
    return Boolean(options.help);
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(_args: string[], options: InitOptions): ValidationResult<InitOptions> {
    // Init help command is valid when help flag is set
    return {
      valid: true,
      result: options
    };
  }

  /**
   * Execute the init help command
   */
  async execute(_args: string[], options: InitOptions): Promise<void> {
    const isJson = options.parent?.json;
    showInitHelp(isJson);
  }
}