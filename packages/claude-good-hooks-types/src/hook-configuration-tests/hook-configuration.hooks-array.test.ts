import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookConfiguration, HookCommand } from '../index.js';

/**
 * Hook Configuration Hooks Array Variations Tests
 */

describe('HookConfiguration - Hooks Array Variations', () => {
  it('should support single hook command', () => {
    const singleHook: HookConfiguration = {
      matcher: 'SingleTool',
      hooks: [
        {
          type: 'command',
          command: 'single-handler',
        },
      ],
    };

    expect(singleHook.hooks).toHaveLength(1);
    expectTypeOf(singleHook.hooks).toEqualTypeOf<HookCommand[]>();
  });

  it('should support multiple hook commands', () => {
    const multipleHooks: HookConfiguration = {
      matcher: 'MultiTool',
      hooks: [
        {
          type: 'command',
          command: 'first-handler',
          timeout: 5000,
        },
        {
          type: 'command',
          command: 'second-handler',
        },
        {
          type: 'command',
          command: 'third-handler',
          timeout: 10000,
        },
      ],
    };

    expect(multipleHooks.hooks).toHaveLength(3);
    expect(multipleHooks.hooks[0].timeout).toBe(5000);
    expect(multipleHooks.hooks[1].timeout).toBeUndefined();
    expect(multipleHooks.hooks[2].timeout).toBe(10000);
  });

  it('should support empty hooks array', () => {
    const emptyHooks: HookConfiguration = {
      matcher: 'EmptyTool',
      hooks: [],
    };

    expect(emptyHooks.hooks).toHaveLength(0);
    expect(Array.isArray(emptyHooks.hooks)).toBe(true);
  });

  it('should maintain hook order', () => {
    const orderedHooks: HookConfiguration = {
      hooks: [
        { type: 'command', command: 'first' },
        { type: 'command', command: 'second' },
        { type: 'command', command: 'third' },
        { type: 'command', command: 'fourth' },
      ],
    };

    expect(orderedHooks.hooks[0].command).toBe('first');
    expect(orderedHooks.hooks[1].command).toBe('second');
    expect(orderedHooks.hooks[2].command).toBe('third');
    expect(orderedHooks.hooks[3].command).toBe('fourth');
  });
});