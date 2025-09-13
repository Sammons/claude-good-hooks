/**
 * Type definitions for export command sub-command pattern
 */

import type { ExportOptions } from './export-options.js';
import type { ValidationResult } from '../common-validation-types.js';

/**
 * Interface for export sub-command implementations
 * Following the duck-typing pattern used in apply commands
 */
export interface ExportSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ExportOptions): boolean;

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: ExportOptions): ValidationResult<any>;

  /**
   * Execute this sub-command
   */
  execute(args: string[], options: ExportOptions): Promise<void>;
}
