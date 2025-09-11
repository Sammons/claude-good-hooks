/**
 * Type definitions for init command sub-command pattern
 */

import type { InitOptions } from './init-options.js';
import type { ValidationResult } from '../common-validation-types.js';

/**
 * Interface for init sub-command implementations
 * Following the duck-typing pattern used in apply commands
 */
export interface InitSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: InitOptions): boolean;

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: InitOptions): ValidationResult<any>;

  /**
   * Execute this sub-command
   */
  execute(args: string[], options: InitOptions): Promise<void>;
}
