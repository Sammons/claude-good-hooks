import { describe, it, expect, expectTypeOf } from 'vitest';
import type { ClaudeSettings } from './index.js';

/**
 * Claude Settings Basic Structure Tests
 */

describe('ClaudeSettings - Basic Structure', () => {
  it('should support empty settings object', () => {
    const emptySettings: ClaudeSettings = {};

    expectTypeOf(emptySettings).toEqualTypeOf<ClaudeSettings>();
    expect(emptySettings.hooks).toBeUndefined();
  });

  it('should support settings with empty hooks object', () => {
    const settingsWithEmptyHooks: ClaudeSettings = {
      hooks: {},
    };

    expectTypeOf(settingsWithEmptyHooks.hooks).toEqualTypeOf<ClaudeSettings['hooks']>();
    expect(settingsWithEmptyHooks.hooks).toBeDefined();
    expect(Object.keys(settingsWithEmptyHooks.hooks!)).toHaveLength(0);
  });

  it('should support settings with all hook types defined', () => {
    const comprehensiveSettings: ClaudeSettings = {
      hooks: {
        PreToolUse: [],
        PostToolUse: [],
        UserPromptSubmit: [],
        Notification: [],
        Stop: [],
        SubagentStop: [],
        SessionEnd: [],
        SessionStart: [],
        PreCompact: [],
      },
    };

    const hooks = comprehensiveSettings.hooks!;
    expect(hooks.PreToolUse).toBeDefined();
    expect(hooks.PostToolUse).toBeDefined();
    expect(hooks.UserPromptSubmit).toBeDefined();
    expect(hooks.Notification).toBeDefined();
    expect(hooks.Stop).toBeDefined();
    expect(hooks.SubagentStop).toBeDefined();
    expect(hooks.SessionEnd).toBeDefined();
    expect(hooks.SessionStart).toBeDefined();
    expect(hooks.PreCompact).toBeDefined();

    // Verify all are arrays
    Object.values(hooks).forEach((hookArray) => {
      expect(Array.isArray(hookArray)).toBe(true);
    });
  });
});