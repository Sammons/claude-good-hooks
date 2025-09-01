import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  ClaudeSettings,
  HookMetadata,
} from './index.js';

/**
 * Settings and Metadata Tests - Testing ClaudeSettings and HookMetadata interfaces
 */

describe('ClaudeSettings Interface', () => {
  it('should define basic settings structure', () => {
    const settings: ClaudeSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Write',
            hooks: [
              {
                type: 'command',
                command: 'prettier --write',
              },
            ],
          },
        ],
      },
    };

    expectTypeOf(settings).toEqualTypeOf<ClaudeSettings>();
    expectTypeOf(settings.hooks).toEqualTypeOf<ClaudeSettings['hooks']>();
  });

  it('should support all hook event types in settings', () => {
    const comprehensiveSettings: ClaudeSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'validate-command.sh' }],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [{ type: 'command', command: 'format-code.sh' }],
          },
        ],
        UserPromptSubmit: [
          {
            hooks: [{ type: 'command', command: 'log-prompt.sh' }],
          },
        ],
        Notification: [
          {
            hooks: [{ type: 'command', command: 'notify-user.sh' }],
          },
        ],
        Stop: [
          {
            hooks: [{ type: 'command', command: 'cleanup.sh' }],
          },
        ],
        SubagentStop: [
          {
            hooks: [{ type: 'command', command: 'subagent-cleanup.sh' }],
          },
        ],
        SessionEnd: [
          {
            hooks: [{ type: 'command', command: 'session-cleanup.sh' }],
          },
        ],
        SessionStart: [
          {
            hooks: [{ type: 'command', command: 'session-init.sh' }],
          },
        ],
        PreCompact: [
          {
            hooks: [{ type: 'command', command: 'pre-compact.sh' }],
          },
        ],
      },
    };

    // Verify all hook event types are correctly structured
    expect(comprehensiveSettings.hooks?.PreToolUse).toBeDefined();
    expect(comprehensiveSettings.hooks?.PostToolUse).toBeDefined();
    expect(comprehensiveSettings.hooks?.UserPromptSubmit).toBeDefined();
    expect(comprehensiveSettings.hooks?.Notification).toBeDefined();
    expect(comprehensiveSettings.hooks?.Stop).toBeDefined();
    expect(comprehensiveSettings.hooks?.SubagentStop).toBeDefined();
    expect(comprehensiveSettings.hooks?.SessionEnd).toBeDefined();
    expect(comprehensiveSettings.hooks?.SessionStart).toBeDefined();
    expect(comprehensiveSettings.hooks?.PreCompact).toBeDefined();
  });

  it('should allow empty settings object', () => {
    const emptySettings: ClaudeSettings = {};
    expectTypeOf(emptySettings).toEqualTypeOf<ClaudeSettings>();
    expect(emptySettings.hooks).toBeUndefined();
  });

  it('should allow settings with empty hooks object', () => {
    const settingsWithEmptyHooks: ClaudeSettings = {
      hooks: {},
    };
    expectTypeOf(settingsWithEmptyHooks).toEqualTypeOf<ClaudeSettings>();
    expect(Object.keys(settingsWithEmptyHooks.hooks || {})).toHaveLength(0);
  });
});

describe('HookMetadata Interface', () => {
  it('should define basic metadata structure', () => {
    const metadata: HookMetadata = {
      name: 'example-hook',
      description: 'An example hook for testing',
      version: '1.2.3',
      source: 'local',
      installed: true,
    };

    expectTypeOf(metadata).toEqualTypeOf<HookMetadata>();
    expectTypeOf(metadata.source).toEqualTypeOf<'local' | 'global' | 'remote'>();
    expectTypeOf(metadata.installed).toEqualTypeOf<boolean>();
    expectTypeOf(metadata.packageName).toEqualTypeOf<string | undefined>();
  });

  it('should support all source types', () => {
    const localMetadata: HookMetadata = {
      name: 'local-hook',
      description: 'Local hook',
      version: '1.0.0',
      source: 'local',
      installed: true,
    };

    const globalMetadata: HookMetadata = {
      name: 'global-hook',
      description: 'Global hook',
      version: '2.0.0',
      source: 'global',
      installed: true,
      packageName: '@company/global-hook',
    };

    const remoteMetadata: HookMetadata = {
      name: 'remote-hook',
      description: 'Remote hook',
      version: '3.0.0',
      source: 'remote',
      installed: false,
      packageName: '@npm/remote-hook',
    };

    expect(localMetadata.source).toBe('local');
    expect(globalMetadata.source).toBe('global');
    expect(remoteMetadata.source).toBe('remote');
  });

  it('should support optional package name', () => {
    const withPackageName: HookMetadata = {
      name: 'packaged-hook',
      description: 'Hook with package name',
      version: '1.0.0',
      source: 'remote',
      installed: true,
      packageName: '@scope/hook-package',
    };

    const withoutPackageName: HookMetadata = {
      name: 'simple-hook',
      description: 'Hook without package name',
      version: '1.0.0',
      source: 'local',
      installed: true,
    };

    expect(withPackageName.packageName).toBe('@scope/hook-package');
    expect(withoutPackageName.packageName).toBeUndefined();
  });
});