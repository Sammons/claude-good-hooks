import { describe, it, expect, expectTypeOf } from 'vitest';
import type { ClaudeSettings, HookConfiguration } from './index.js';

/**
 * Claude Settings Type Safety and Validation Tests
 */

describe('ClaudeSettings - Type Safety and Validation', () => {
  it('should enforce correct type for all hook arrays', () => {
    const settings: ClaudeSettings = {
      hooks: {
        PreToolUse: [{ hooks: [{ type: 'command', command: 'test' }] }],
        PostToolUse: [{ hooks: [{ type: 'command', command: 'test' }] }],
        UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'test' }] }],
        Notification: [{ hooks: [{ type: 'command', command: 'test' }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'test' }] }],
        SubagentStop: [{ hooks: [{ type: 'command', command: 'test' }] }],
        SessionEnd: [{ hooks: [{ type: 'command', command: 'test' }] }],
        SessionStart: [{ hooks: [{ type: 'command', command: 'test' }] }],
        PreCompact: [{ hooks: [{ type: 'command', command: 'test' }] }],
      },
    };

    const hooks = settings.hooks!;
    
    expectTypeOf(hooks.PreToolUse).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hooks.PostToolUse).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hooks.UserPromptSubmit).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hooks.Notification).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hooks.Stop).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hooks.SubagentStop).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hooks.SessionEnd).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hooks.SessionStart).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hooks.PreCompact).toEqualTypeOf<HookConfiguration[] | undefined>();
  });

  it('should allow partial hook definitions', () => {
    const partialSettings: ClaudeSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Write',
            hooks: [{ type: 'command', command: 'pre-write' }],
          },
        ],
        PostToolUse: [
          {
            hooks: [{ type: 'command', command: 'post-any' }],
          },
        ],
        // Other hook types omitted
      },
    };

    expect(partialSettings.hooks!.PreToolUse).toBeDefined();
    expect(partialSettings.hooks!.PostToolUse).toBeDefined();
    expect(partialSettings.hooks!.UserPromptSubmit).toBeUndefined();
    expect(partialSettings.hooks!.SessionStart).toBeUndefined();
  });

  it('should handle deeply nested structures correctly', () => {
    const deepSettings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'complex-matcher',
            hooks: [
              {
                type: 'command',
                command: 'complex-command-with-args.sh --arg1 value1 --arg2 "value with spaces" --flag',
                timeout: 45000,
              },
            ],
          },
        ],
      },
    };

    const command = deepSettings.hooks!.PostToolUse![0].hooks[0];
    expectTypeOf(command.type).toEqualTypeOf<'command'>();
    expectTypeOf(command.command).toEqualTypeOf<string>();
    expectTypeOf(command.timeout).toEqualTypeOf<number | undefined>();
    
    expect(command.command.length).toBeGreaterThan(50);
    expect(command.timeout).toBe(45000);
  });
});