import { z } from 'zod';
import type { ValidationResult } from '../common-validation-types';

/**
 * Zod schema for ValidateOptions validation
 */
export const ValidateOptionsSchema = z.object({
  scope: z.enum(['project', 'global', 'local', 'all']).optional(),
  testCommands: z.boolean().optional(),
  checkPaths: z.boolean().optional(),
  verbose: z.boolean().optional(),
  fix: z.boolean().optional(),
  migrate: z.boolean().optional(),
  help: z.boolean().optional(),
  parent: z.object({
    json: z.boolean().optional(),
  }).strict().optional(),
}).strict();

/**
 * ValidateOptions type inferred from Zod schema
 */
export type ValidateOptions = z.infer<typeof ValidateOptionsSchema>;

/**
 * Validate command arguments using Zod schema
 */
export function validateValidateCommand(args: string[], options: unknown): ValidationResult<ValidateOptions> {
  // Special case: help command without args is valid  
  const isHelpWithoutArgs = args.length === 0 && 
    typeof options === 'object' && 
    options !== null &&
    'help' in options && 
    (options as any).help === true;

  // Validate basic requirements - validate command doesn't require args
  if (args.length > 0) {
    return {
      valid: false,
      errors: ['Validate command does not accept positional arguments']
    };
  }

  // Validate options using Zod schema
  const result = ValidateOptionsSchema.safeParse(options);
  
  if (!result.success) {
    const errors = result.error.issues.map(issue => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    });
    
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    result: result.data
  };
}