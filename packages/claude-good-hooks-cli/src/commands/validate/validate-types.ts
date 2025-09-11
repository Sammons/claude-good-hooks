/**
 * Type definitions for validate command sub-command pattern
 */

import type { ValidateOptions } from './validate-options.js';
import type { ValidationResult } from '../common-validation-types.js';

/**
 * Interface for validate sub-command implementations
 * Following the duck-typing pattern used in apply commands
 */
export interface ValidateSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ValidateOptions): boolean;

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: ValidateOptions): ValidationResult<any>;

  /**
   * Execute this sub-command
   */
  execute(args: string[], options: ValidateOptions): Promise<void>;
}
