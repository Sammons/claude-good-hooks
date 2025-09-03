import { describe, it, expect } from 'vitest';
import { isHookConfiguration, type HookConfiguration } from '../index.js';

/**
 * Type Guards Tests - isHookConfiguration
 */

describe('Type Guards - isHookConfiguration', () => {
  it('should validate correct HookConfiguration objects', () => {
    const validConfigurations: HookConfiguration[] = [
      {
        hooks: [{ type: 'command', command: 'test' }],
      },
      {
        matcher: 'Write',
        hooks: [
          { type: 'command', command: 'format' },
          { type: 'command', command: 'lint', timeout: 30000 },
        ],
      },
      {
        matcher: '',
        hooks: [],
      },
    ];

    validConfigurations.forEach(config => {
      expect(isHookConfiguration(config)).toBe(true);
    });
  });

  it('should reject invalid HookConfiguration objects', () => {
    const invalidConfigurations = [
      null,
      undefined,
      {},
      { hooks: 'not an array' },
      { hooks: [{ type: 'invalid', command: 'test' }] }, // invalid hook command
      { hooks: [null] }, // invalid hook command
      { hooks: [{ type: 'command', command: 'test' }, 'invalid'] }, // mixed valid/invalid
      { matcher: 123, hooks: [] }, // matcher not string
      'not an object',
      [],
    ];

    invalidConfigurations.forEach(config => {
      expect(isHookConfiguration(config)).toBe(false);
    });
  });

  it('should handle edge cases', () => {
    // Empty hooks array should be valid
    expect(
      isHookConfiguration({
        hooks: [],
      })
    ).toBe(true);

    // Empty string matcher should be valid
    expect(
      isHookConfiguration({
        matcher: '',
        hooks: [{ type: 'command', command: 'test' }],
      })
    ).toBe(true);

    // Missing matcher should be valid
    expect(
      isHookConfiguration({
        hooks: [{ type: 'command', command: 'test' }],
      })
    ).toBe(true);

    // Complex regex matcher should be valid
    expect(
      isHookConfiguration({
        matcher: '^(Write|Edit)$|Notebook.*',
        hooks: [{ type: 'command', command: 'test' }],
      })
    ).toBe(true);
  });
});
