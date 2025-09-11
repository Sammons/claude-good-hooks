import { z } from 'zod';
import type { ValidationResult } from '../common-validation-types';

/**
 * Zod schema for ApplyOptions validation
 */
export const ApplyOptionsSchema = z
  .object({
    global: z.boolean().optional(),
    project: z.boolean().optional(),
    local: z.boolean().optional(),
    help: z.boolean().optional(),
    regenerate: z.boolean().optional(),
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
      // Cannot use multiple scope flags simultaneously
      const scopeFlags = [data.global, data.project, data.local].filter(Boolean).length;
      if (scopeFlags > 1) {
        return false;
      }
      return true;
    },
    {
      message: 'Cannot specify multiple scope flags (--global, --project, --local) simultaneously',
    }
  );

/**
 * ApplyOptions type inferred from Zod schema
 */
export type ApplyOptions = z.infer<typeof ApplyOptionsSchema>;

/**
 * Validate command arguments using Zod schema
 */
export function validateApplyCommand(
  args: string[],
  options: unknown
): ValidationResult<ApplyOptions> {
  // Special case: regenerate command without hook name is valid
  const isRegenerateWithoutArgs =
    args.length === 0 &&
    typeof options === 'object' &&
    options !== null &&
    'regenerate' in options &&
    (options as any).regenerate === true;

  // Special case: help command without hook name is valid
  const isHelpWithoutArgs =
    args.length === 0 &&
    typeof options === 'object' &&
    options !== null &&
    'help' in options &&
    (options as any).help === true;

  // Validate basic requirements
  if (args.length === 0 && !isRegenerateWithoutArgs && !isHelpWithoutArgs) {
    return {
      valid: false,
      errors: ['Hook name is required unless using --regenerate or --help flag'],
    };
  }

  // Validate options using Zod schema
  const result = ApplyOptionsSchema.safeParse(options);

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

  return {
    valid: true,
    result: result.data,
  };
}
