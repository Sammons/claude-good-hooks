import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookConfiguration, HookCommand } from '../index.js';

/**
 * Hook Configuration Core Structure Tests
 */

describe('HookConfiguration - Core Structure', () => {
  it('should require hooks array as mandatory field', () => {
    const config: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'echo "test"',
        },
      ],
    };

    expectTypeOf(config.hooks).toEqualTypeOf<HookCommand[]>();
    expect(Array.isArray(config.hooks)).toBe(true);
  });

  it('should make matcher field optional', () => {
    const configWithoutMatcher: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'global-command',
        },
      ],
    };

    const configWithMatcher: HookConfiguration = {
      matcher: 'specific-tool',
      hooks: [
        {
          type: 'command',
          command: 'specific-command',
        },
      ],
    };

    expectTypeOf(configWithoutMatcher.matcher).toEqualTypeOf<string | undefined>();
    expectTypeOf(configWithMatcher.matcher).toEqualTypeOf<string | undefined>();
    
    expect(configWithoutMatcher.matcher).toBeUndefined();
    expect(configWithMatcher.matcher).toBe('specific-tool');
  });
});