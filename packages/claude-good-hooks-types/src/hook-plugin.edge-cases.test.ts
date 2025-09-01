import { describe, it, expect } from 'vitest';
import type { HookPlugin } from './index.js';

/**
 * Hook Plugin Edge Cases and Error Scenarios Tests
 */

describe('HookPlugin - Edge Cases and Error Scenarios', () => {
  it('should handle makeHook function that throws errors', () => {
    const errorPlugin: HookPlugin = {
      name: 'error-plugin',
      description: 'Plugin that throws errors',
      version: '1.0.0',
      makeHook: (args) => {
        if (args.shouldThrow) {
          throw new Error('Plugin error');
        }
        return {};
      },
    };

    expect(() => errorPlugin.makeHook({ shouldThrow: false })).not.toThrow();
    expect(() => errorPlugin.makeHook({ shouldThrow: true })).toThrow('Plugin error');
  });

  it('should handle makeHook function with complex argument validation', () => {
    const validatingPlugin: HookPlugin = {
      name: 'validating-plugin',
      description: 'Plugin with argument validation',
      version: '1.0.0',
      customArgs: {
        requiredArg: {
          description: 'A required argument',
          type: 'string',
          required: true,
        },
      },
      makeHook: (args) => {
        if (!args.requiredArg) {
          throw new Error('requiredArg is mandatory');
        }
        
        if (typeof args.requiredArg !== 'string') {
          throw new Error('requiredArg must be a string');
        }

        return {
          PreToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: `echo "${args.requiredArg}"`,
                },
              ],
            },
          ],
        };
      },
    };

    expect(() => validatingPlugin.makeHook({})).toThrow('requiredArg is mandatory');
    expect(() => validatingPlugin.makeHook({ requiredArg: 123 })).toThrow('requiredArg must be a string');
    expect(() => validatingPlugin.makeHook({ requiredArg: 'valid' })).not.toThrow();
  });

  it('should handle makeHook with extremely complex return structures', () => {
    const complexPlugin: HookPlugin = {
      name: 'ultra-complex-plugin',
      description: 'Plugin with extremely complex configurations',
      version: '1.0.0',
      makeHook: () => ({
        PreToolUse: Array.from({ length: 10 }, (_, i) => ({
          matcher: `Tool${i}`,
          hooks: Array.from({ length: 5 }, (_, j) => ({
            type: 'command' as const,
            command: `command-${i}-${j}`,
            timeout: (i + 1) * (j + 1) * 1000,
          })),
        })),
        PostToolUse: [
          {
            matcher: 'Write|Edit|MultiEdit|Read|Bash|Grep|Glob|Task',
            hooks: [
              {
                type: 'command',
                command: 'echo "Complex post-processing with special chars: !@#$%^&*()"',
                timeout: 0,
              },
            ],
          },
        ],
      }),
    };

    const result = complexPlugin.makeHook({});
    expect(result.PreToolUse).toHaveLength(10);
    expect(result.PreToolUse![0].hooks).toHaveLength(5);
    expect(result.PreToolUse![9].hooks[4].timeout).toBe(50000); // 10 * 5 * 1000
  });
});