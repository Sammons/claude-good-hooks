import type { ApplyOptions, ValidationResult } from './apply-types.js';

/**
 * Validate command arguments
 */
export function validateApplyCommand(args: string[], options: ApplyOptions): boolean | ValidationResult {
  if (args.length === 0 && !options.help && !options.regenerate) {
    return {
      valid: false,
      errors: ['Hook name is required unless using --regenerate flag']
    };
  }
  return true;
}