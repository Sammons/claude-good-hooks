/**
 * Import help sub-command implementation
 */

import type { ImportSubCommand } from './import-types.js';
import type { ImportOptions } from './import-options.js';
import type { ValidationResult } from '../common-validation-types.js';
import { showImportHelp } from './import-command-help.js';

export class ImportHelpCommand implements ImportSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(_args: string[], options: ImportOptions): boolean {
    // Match when help flag is set and no source provided, or when no args and help flag is set
    return Boolean(options.help);
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(_args: string[], options: ImportOptions): ValidationResult<ImportOptions> {
    // Import help command is valid when help flag is set
    return {
      valid: true,
      result: options,
    };
  }

  /**
   * Execute the import help command
   */
  async execute(_args: string[], options: ImportOptions): Promise<void> {
    const isJson = options.parent?.json;
    showImportHelp(isJson);
  }
}
