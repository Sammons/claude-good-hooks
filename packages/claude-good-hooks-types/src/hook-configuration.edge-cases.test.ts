import { describe, it, expect } from 'vitest';
import type { HookConfiguration } from './index.js';

/**
 * Hook Configuration Edge Cases and Validation Tests
 */

describe('HookConfiguration - Edge Cases and Validation', () => {
  it('should handle very long command strings', () => {
    const longCommand = 'echo "' + 'a'.repeat(5000) + '"';
    const config: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: longCommand,
        },
      ],
    };

    expect(config.hooks[0].command.length).toBe(longCommand.length);
  });

  it('should handle special characters in commands', () => {
    const specialCharsConfig: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'echo "Special chars: !@#$%^&*()_+-={}[]|\\:";\'<>?,./"',
        },
        {
          type: 'command',
          command: 'grep -r "pattern with spaces and quotes \\"nested\\"" .',
        },
      ],
    };

    expect(specialCharsConfig.hooks).toHaveLength(2);
  });

  it('should handle unicode characters', () => {
    const unicodeConfig: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'echo "Unicode: 你好 🌍 emoji test"',
        },
      ],
    };

    expect(unicodeConfig.hooks[0].command).toContain('你好');
    expect(unicodeConfig.hooks[0].command).toContain('🌍');
  });

  it('should handle extreme timeout values', () => {
    const extremeTimeouts: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'instant',
          timeout: 0,
        },
        {
          type: 'command',
          command: 'max-safe-integer',
          timeout: Number.MAX_SAFE_INTEGER,
        },
        {
          type: 'command',
          command: 'very-large',
          timeout: 999999999,
        },
      ],
    };

    expect(extremeTimeouts.hooks[0].timeout).toBe(0);
    expect(extremeTimeouts.hooks[1].timeout).toBe(Number.MAX_SAFE_INTEGER);
    expect(extremeTimeouts.hooks[2].timeout).toBe(999999999);
  });
});