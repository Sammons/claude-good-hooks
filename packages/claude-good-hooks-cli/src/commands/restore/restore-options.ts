import { z } from 'zod';
import type { ValidationResult } from '../common-validation-types';

/**
 * Zod schema for RestoreOptions validation
 */
export const RestoreOptionsSchema = z
  .object({
    help: z.boolean().optional(),
    latest: z.boolean().optional(),
    scope: z.enum(['project', 'global', 'local']).optional(),
    force: z.boolean().optional(),
    yes: z.boolean().optional(),
    parent: z
      .object({
        json: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    data => {
      // Cannot specify filename when using --latest flag
      // This validation will be handled at command level since it involves args
      return true;
    },
    {
      message: 'Invalid option combination',
    }
  );

/**
 * RestoreOptions type inferred from Zod schema
 */
export type RestoreOptions = z.infer<typeof RestoreOptionsSchema>;

/**
 * Validate command arguments using Zod schema
 */
export function validateRestoreCommand(
  args: string[],
  options: unknown
): ValidationResult<RestoreOptions> {
  // Validate options using Zod schema
  const result = RestoreOptionsSchema.safeParse(options);

  if (!result.success) {
    const errors = result.error.issues.map(issue => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    });

    return {
      valid: false,
      errors,
    };
  }

  const restoreOptions = result.data;

  // Special case: help command without args is valid
  const isHelpWithoutArgs = args.length === 0 && restoreOptions.help === true;

  // Special case: latest command without args is valid
  const isLatestWithoutArgs = args.length === 0 && restoreOptions.latest === true;

  // Validate argument constraints
  if (restoreOptions.latest && args.length > 0) {
    return {
      valid: false,
      errors: ['Cannot specify filename when using --latest flag'],
    };
  }

  // Validate basic requirements
  if (args.length === 0 && !isHelpWithoutArgs && !isLatestWithoutArgs) {
    return {
      valid: false,
      errors: ['Backup filename is required (or use --latest to restore most recent backup)'],
    };
  }

  return {
    valid: true,
    result: restoreOptions,
  };
}
