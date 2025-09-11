/**
 * Restore help sub-command implementation
 */

import type { RestoreSubCommand } from './restore-types.js';
import type { RestoreOptions } from './restore-options.js';
import type { ValidationResult } from '../common-validation-types.js';
import { showRestoreHelp } from './restore-command-help.js';

export class RestoreHelpCommand implements RestoreSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: RestoreOptions): boolean {
    // Match when help flag is set and no backup file provided, or when no args and no special flags
    return (
      (Boolean(options.help) && args.length === 0) ||
      (args.length === 0 && !options.latest && !options.help)
    );
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: RestoreOptions): ValidationResult<RestoreOptions> {
    // Restore help command is valid when help flag is set
    return {
      valid: true,
      result: options,
    };
  }

  /**
   * Execute the restore help command
   */
  async execute(args: string[], options: RestoreOptions): Promise<void> {
    const isJson = options.parent?.json;
    showRestoreHelp(isJson);
  }
}
