import { z } from 'zod';
import type { ValidationResult } from '../common-validation-types';

/**
 * Zod schema for ImportOptions validation
 */
export const ImportOptionsSchema = z.object({
  help: z.boolean().optional(),
  source: z.string().optional(),
  scope: z.enum(['project', 'global', 'local']).optional(),
  merge: z.boolean().optional(),
  force: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  validate: z.boolean().optional(),
  yes: z.boolean().optional(),
  parent: z.object({
    json: z.boolean().optional(),
  }).strict().optional(),
}).strict();

/**
 * ImportOptions type inferred from Zod schema
 */
export type ImportOptions = z.infer<typeof ImportOptionsSchema>;

/**
 * Validate command arguments using Zod schema
 */
export function validateImportCommand(args: string[], options: unknown): ValidationResult<ImportOptions> {
  // Special case: help command without source is valid  
  const isHelpWithoutArgs = args.length === 0 && 
    typeof options === 'object' && 
    options !== null &&
    'help' in options && 
    (options as any).help === true;

  // Validate basic requirements
  if (args.length === 0 && !isHelpWithoutArgs) {
    return {
      valid: false,
      errors: ['Source is required unless using --help flag']
    };
  }

  // Validate options using Zod schema
  const result = ImportOptionsSchema.safeParse(options);
  
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