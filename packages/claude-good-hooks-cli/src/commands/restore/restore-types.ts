/**
 * Type definitions for restore command sub-command pattern
 */

import type { RestoreOptions } from './restore-options.js';
import type { ValidationResult } from '../common-validation-types.js';

/**
 * Interface for restore sub-command implementations
 * Following the duck-typing pattern used in apply commands
 */
export interface RestoreSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: RestoreOptions): boolean;

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: RestoreOptions): ValidationResult<any>;

  /**
   * Execute this sub-command
   */
  execute(args: string[], options: RestoreOptions): Promise<void>;
}
