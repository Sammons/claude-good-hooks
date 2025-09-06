import { z } from 'zod';
import type { ValidationResult } from '../common-validation-types';

/**
 * Zod schema for ExportOptions validation
 */
export const ExportOptionsSchema = z.object({
  help: z.boolean().optional(),
  output: z.string().optional(),
  scope: z.enum(['project', 'global', 'local', 'all']).optional(),
  format: z.enum(['json', 'yaml', 'template']).optional(),
  minify: z.boolean().optional(),
  includeMetadata: z.boolean().optional(),
  backup: z.boolean().optional(),
  parent: z.object({
    json: z.boolean().optional(),
  }).strict().optional(),
}).strict();

/**
 * ExportOptions type inferred from Zod schema
 */
export type ExportOptions = z.infer<typeof ExportOptionsSchema>;

/**
 * Validate command arguments using Zod schema
 */
export function validateExportCommand(args: string[], options: unknown): ValidationResult<ExportOptions> {
  // Export command doesn't require arguments
  if (args.length > 0) {
    return {
      valid: false,
      errors: ['Export command does not accept positional arguments']
    };
  }

  // Validate options using Zod schema
  const result = ExportOptionsSchema.safeParse(options);
  
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