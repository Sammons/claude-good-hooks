import { describe, it, expect, expectTypeOf } from 'vitest';
import * as Types from './index.js';

/**
 * Import scenario tests - verify that types can be imported correctly
 * and used as expected by consumers of the package
 */

describe('Package Import Tests', () => {
  it('should export all required types', () => {
    // Verify all expected exports are available
    expect(typeof Types).toBe('object');

    // These should be available as type-only exports
    // We can't check for them at runtime, but TypeScript will validate
    expectTypeOf<Types.HookCommand>().toEqualTypeOf<{
      type: 'command';
      command: string;
      timeout?: number;
    }>();

    expectTypeOf<Types.HookConfiguration>().toEqualTypeOf<{
      matcher?: string;
      hooks: Types.HookCommand[];
    }>();

    expectTypeOf<Types.HookPlugin>().toMatchTypeOf<{
      name: string;
      description: string;
      version: string;
      customArgs?: Record<string, any>;
      makeHook: (args: Record<string, any>) => any;
    }>();

    expectTypeOf<Types.ClaudeSettings>().toEqualTypeOf<{
      hooks?: {
        PreToolUse?: Types.HookConfiguration[];
        PostToolUse?: Types.HookConfiguration[];
        UserPromptSubmit?: Types.HookConfiguration[];
        Notification?: Types.HookConfiguration[];
        Stop?: Types.HookConfiguration[];
        SubagentStop?: Types.HookConfiguration[];
        SessionEnd?: Types.HookConfiguration[];
        SessionStart?: Types.HookConfiguration[];
        PreCompact?: Types.HookConfiguration[];
      };
    }>();

    expectTypeOf<Types.HookMetadata>().toEqualTypeOf<{
      name: string;
      description: string;
      version: string;
      source: 'local' | 'global' | 'remote';
      packageName?: string;
      installed: boolean;
    }>();
  });

  it('should work with destructured imports', () => {
    // Simulate how consumers would import types
    const createHookCommand = (cmd: string, timeout?: number): Types.HookCommand => ({
      type: 'command',
      command: cmd,
      timeout,
    });

    const createConfiguration = (
      hooks: Types.HookCommand[],
      matcher?: string
    ): Types.HookConfiguration => ({
      hooks,
      matcher,
    });

    const createSettings = (preToolUse?: Types.HookConfiguration[]): Types.ClaudeSettings => ({
      hooks: {
        PreToolUse: preToolUse,
      },
    });

    // Use the functions to verify types work correctly
    const command = createHookCommand('echo test', 1000);
    const config = createConfiguration([command], 'Write');
    const settings = createSettings([config]);

    expect(command.type).toBe('command');
    expect(command.command).toBe('echo test');
    expect(command.timeout).toBe(1000);

    expect(config.hooks).toHaveLength(1);
    expect(config.matcher).toBe('Write');

    expect(settings.hooks?.PreToolUse).toHaveLength(1);
    expect(settings.hooks?.PreToolUse?.[0]).toBe(config);
  });

  it('should support type-safe plugin creation', () => {
    const createPlugin = (
      name: string,
      description: string,
      version: string
    ): Types.HookPlugin => ({
      name,
      description,
      version,
      customArgs: {
        enabled: {
          description: 'Enable the plugin',
          type: 'boolean',
          default: true,
        },
        command: {
          description: 'Command to run',
          type: 'string',
          required: true,
        },
      },
      makeHook: args => ({
        PostToolUse: args.enabled
          ? [
              {
                hooks: [
                  {
                    type: 'command',
                    command: args.command,
                  },
                ],
              },
            ]
          : undefined,
      }),
    });

    const plugin = createPlugin('test-plugin', 'A test plugin', '1.0.0');
    const hooks = plugin.makeHook({ enabled: true, command: 'test' });

    expect(plugin.name).toBe('test-plugin');
    expect(plugin.customArgs?.enabled?.type).toBe('boolean');
    expect(plugin.customArgs?.command?.required).toBe(true);

    expect(hooks.PostToolUse).toHaveLength(1);
    expect(hooks.PostToolUse?.[0]?.hooks[0]?.command).toBe('test');

    // Test with disabled plugin
    const disabledHooks = plugin.makeHook({ enabled: false, command: 'test' });
    expect(disabledHooks.PostToolUse).toBeUndefined();
  });

  it('should support metadata creation and validation', () => {
    const createMetadata = (
      name: string,
      source: Types.HookMetadata['source'],
      installed: boolean,
      packageName?: string
    ): Types.HookMetadata => ({
      name,
      description: `Hook: ${name}`,
      version: '1.0.0',
      source,
      packageName,
      installed,
    });

    const localMeta = createMetadata('local-hook', 'local', true);
    const remoteMeta = createMetadata('remote-hook', 'remote', false, '@npm/remote-hook');
    const globalMeta = createMetadata('global-hook', 'global', true, '@company/hook');

    expect(localMeta.source).toBe('local');
    expect(localMeta.packageName).toBeUndefined();
    expect(localMeta.installed).toBe(true);

    expect(remoteMeta.source).toBe('remote');
    expect(remoteMeta.packageName).toBe('@npm/remote-hook');
    expect(remoteMeta.installed).toBe(false);

    expect(globalMeta.source).toBe('global');
    expect(globalMeta.packageName).toBe('@company/hook');
    expect(globalMeta.installed).toBe(true);
  });
});
