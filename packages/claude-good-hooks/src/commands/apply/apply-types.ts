/**
 * Type definitions for apply command sub-command pattern
 */

import type { ApplyOptions } from './apply-options.js';
import type { ValidationResult } from '../common-validation-types.js';

/**
 * Interface for apply sub-command implementations
 * Following the duck-typing pattern used in debug commands
 */
export interface ApplySubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ApplyOptions): boolean;

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: ApplyOptions): ValidationResult<any>;

  /**
   * Execute this sub-command
   */
  execute(args: string[], options: ApplyOptions): Promise<void>;
}
