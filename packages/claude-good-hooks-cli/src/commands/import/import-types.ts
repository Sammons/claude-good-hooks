/**
 * Type definitions for import command sub-command pattern
 */

import type { ImportOptions } from './import-options.js';
import type { ValidationResult } from '../common-validation-types.js';

/**
 * Interface for import sub-command implementations
 * Following the duck-typing pattern used in apply commands
 */
export interface ImportSubCommand {
  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ImportOptions): boolean;
  
  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: ImportOptions): ValidationResult<any>;
  
  /**
   * Execute this sub-command
   */
  execute(args: string[], options: ImportOptions): Promise<void>;
}