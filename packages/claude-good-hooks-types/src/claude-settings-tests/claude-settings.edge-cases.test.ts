import { describe, it, expect } from 'vitest';
import type { ClaudeSettings } from '../index.js';

/**
 * Claude Settings Edge Cases Tests
 */

describe('ClaudeSettings - Edge Cases', () => {
  it('should handle settings with only some hook types', () => {
    const minimalSettings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            hooks: [{ type: 'command', command: 'minimal-post' }],
          },
        ],
      },
    };

    expect(Object.keys(minimalSettings.hooks!)).toEqual(['PostToolUse']);
    expect(minimalSettings.hooks!.PreToolUse).toBeUndefined();
  });

  it('should handle empty hook arrays', () => {
    const emptyHooksSettings: ClaudeSettings = {
      hooks: {
        PreToolUse: [],
        PostToolUse: [],
      },
    };

    expect(emptyHooksSettings.hooks!.PreToolUse).toHaveLength(0);
    expect(emptyHooksSettings.hooks!.PostToolUse).toHaveLength(0);
  });

  it('should handle hooks with no commands', () => {
    const noCommandsSettings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write',
            hooks: [], // Empty hooks array
          },
        ],
      },
    };

    expect(noCommandsSettings.hooks!.PostToolUse![0].hooks).toHaveLength(0);
  });

  it('should handle very complex configurations', () => {
    const complexSettings: ClaudeSettings = {
      hooks: {
        PreToolUse: Array.from({ length: 10 }, (_, i) => ({
          matcher: `Tool${i}`,
          hooks: Array.from({ length: 3 }, (_, j) => ({
            type: 'command' as const,
            command: `command-${i}-${j}`,
            timeout: Math.random() > 0.5 ? (i + 1) * (j + 1) * 1000 : undefined,
          })),
        })),
        PostToolUse: [
          {
            matcher: 'Write|Edit|MultiEdit|Read|Bash|Grep|Glob|Task|WebFetch|WebSearch',
            hooks: [
              {
                type: 'command',
                command: 'universal-post-handler.sh',
                timeout: 30000,
              },
            ],
          },
        ],
      },
    };

    expect(complexSettings.hooks!.PreToolUse).toHaveLength(10);
    expect(complexSettings.hooks!.PreToolUse![0].hooks).toHaveLength(3);
    expect(complexSettings.hooks!.PostToolUse![0].matcher).toContain('Write|Edit');
  });
});