import { describe, it, expect } from 'vitest';
import { validateApplyCommand, ApplyOptionsSchema } from './apply-options.js';

describe('ApplyOptions Zod validation', () => {
  describe('validateApplyCommand', () => {
    it('should validate valid options with hook name', () => {
      const args = ['test-hook'];
      const options = {
        global: true,
        help: false,
        regenerate: false,
        parent: { json: false },
      };

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.result.global).toBe(true);
        expect(result.result.help).toBe(false);
        expect(result.result.regenerate).toBe(false);
        expect(result.result.parent?.json).toBe(false);
      }
    });

    it('should validate regenerate command without hook name', () => {
      const args: string[] = [];
      const options = {
        regenerate: true,
        global: true,
      };

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.result.regenerate).toBe(true);
        expect(result.result.global).toBe(true);
      }
    });

    it('should validate help command without hook name', () => {
      const args: string[] = [];
      const options = {
        help: true,
      };

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.result.help).toBe(true);
      }
    });

    it('should reject missing hook name without valid flags', () => {
      const args: string[] = [];
      const options = {
        global: true,
      };

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain(
          'Hook name is required unless using --regenerate or --help flag'
        );
      }
    });

    it('should reject both global and local flags', () => {
      const args = ['test-hook'];
      const options = {
        global: true,
        local: true,
      };

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain(
          'Cannot specify multiple scope flags (--global, --project, --local) simultaneously'
        );
      }
    });

    it('should reject unknown properties due to strict schema', () => {
      const args = ['test-hook'];
      const options = {
        global: true,
        unknownProperty: true,
      };

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(error => error.includes('Unrecognized key'))).toBe(true);
      }
    });

    it('should reject invalid property types', () => {
      const args = ['test-hook'];
      const options = {
        global: 'invalid-type', // Should be boolean
        help: false,
      };

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(error => error.includes('global'))).toBe(true);
      }
    });

    it('should validate minimal valid options', () => {
      const args = ['test-hook'];
      const options = {};

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.result.global).toBeUndefined();
        expect(result.result.local).toBeUndefined();
        expect(result.result.help).toBeUndefined();
        expect(result.result.regenerate).toBeUndefined();
        expect(result.result.parent).toBeUndefined();
      }
    });

    it('should validate nested parent object', () => {
      const args = ['test-hook'];
      const options = {
        parent: {
          json: true,
        },
      };

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.result.parent?.json).toBe(true);
      }
    });

    it('should reject invalid parent object structure', () => {
      const args = ['test-hook'];
      const options = {
        parent: {
          json: 'not-boolean', // Should be boolean
          unknownNested: true,
        },
      };

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(error => error.includes('parent.json'))).toBe(true);
        expect(result.errors.some(error => error.includes('Unrecognized key'))).toBe(true);
      }
    });

    it('should handle null and undefined options', () => {
      const args = ['test-hook'];

      const nullResult = validateApplyCommand(args, null);
      expect(nullResult.valid).toBe(false);

      const undefinedResult = validateApplyCommand(args, undefined);
      expect(undefinedResult.valid).toBe(false);
    });

    it('should handle non-object options', () => {
      const args = ['test-hook'];
      const options = 'string-instead-of-object';

      const result = validateApplyCommand(args, options);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(error => error.includes('expected object'))).toBe(true);
      }
    });
  });

  describe('ApplyOptionsSchema direct validation', () => {
    it('should validate complete valid schema', () => {
      const validOptions = {
        global: false,
        local: true,
        help: false,
        regenerate: false,
        parent: {
          json: true,
        },
      };

      const result = ApplyOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.local).toBe(true);
        expect(result.data.parent?.json).toBe(true);
      }
    });

    it('should reject conflicting global and local flags', () => {
      const conflictingOptions = {
        global: true,
        local: true,
      };

      const result = ApplyOptionsSchema.safeParse(conflictingOptions);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(issue =>
            issue.message.includes(
              'Cannot specify multiple scope flags (--global, --project, --local) simultaneously'
            )
          )
        ).toBe(true);
      }
    });

    it('should allow empty object', () => {
      const result = ApplyOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject extra properties', () => {
      const optionsWithExtra = {
        global: true,
        extraProperty: 'not-allowed',
      };

      const result = ApplyOptionsSchema.safeParse(optionsWithExtra);
      expect(result.success).toBe(false);
    });
  });
});
