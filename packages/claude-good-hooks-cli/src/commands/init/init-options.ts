import { z } from 'zod';
import type { ValidationResult } from '../common-validation-types';

/**
 * Zod schema for InitOptions validation
 */
export const InitOptionsSchema = z.object({
  help: z.boolean().optional(),
  force: z.boolean().optional(),
  scope: z.enum(['project', 'global']).optional(),
  template: z.string().optional(),
  yes: z.boolean().optional(),
  parent: z.object({
    json: z.boolean().optional(),
  }).strict().optional(),
}).strict();

/**
 * InitOptions type inferred from Zod schema
 */
export type InitOptions = z.infer<typeof InitOptionsSchema>;

/**
 * Validate command arguments using Zod schema
 */
export function validateInitCommand(args: string[], options: unknown): ValidationResult<InitOptions> {
  // Init command doesn't require arguments, but validate them anyway
  if (args.length > 0) {
    return {
      valid: false,
      errors: ['Init command does not accept arguments']
    };
  }

  // Validate options using Zod schema
  const result = InitOptionsSchema.safeParse(options);
  
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