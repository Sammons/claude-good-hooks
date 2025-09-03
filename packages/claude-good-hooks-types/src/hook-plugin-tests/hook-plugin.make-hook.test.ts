import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookPlugin, HookConfiguration } from '../index.js';

/**
 * Hook Plugin makeHook Function Tests
 */

describe('HookPlugin - makeHook Function', () => {
  it('should accept empty arguments and return valid hook configurations', () => {
    const plugin: HookPlugin = {
      name: 'empty-args-plugin',
      description: 'Plugin that works with empty args',
      version: '1.0.0',
      makeHook: args => {
        expect(typeof args).toBe('object');
        return {
          PreToolUse: [
            {
              hooks: [{ type: 'command', command: 'echo "no args"' }],
            },
          ],
        };
      },
    };

    const result = plugin.makeHook({});
    expect(result.PreToolUse).toBeDefined();
    expect(result.PreToolUse![0].hooks[0].command).toBe('echo "no args"');
  });

  it('should use arguments in hook generation', () => {
    const plugin: HookPlugin = {
      name: 'args-using-plugin',
      description: 'Plugin that uses arguments',
      version: '1.0.0',
      customArgs: {
        command: {
          description: 'Command to execute',
          type: 'string',
          required: true,
        },
        timeout: {
          description: 'Command timeout',
          type: 'number',
          default: 30000,
        },
        enabled: {
          description: 'Whether to enable the hook',
          type: 'boolean',
          default: true,
        },
      },
      makeHook: args => {
        if (!args.enabled) {
          return {};
        }

        return {
          PostToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: args.command || 'echo "default command"',
                  timeout: args.timeout,
                },
              ],
            },
          ],
        };
      },
    };

    // Test with enabled=true
    const enabledResult = plugin.makeHook({
      command: 'custom-command',
      timeout: 60000,
      enabled: true,
    });

    expect(enabledResult.PostToolUse).toBeDefined();
    expect(enabledResult.PostToolUse![0].hooks[0].command).toBe('custom-command');
    expect(enabledResult.PostToolUse![0].hooks[0].timeout).toBe(60000);

    // Test with enabled=false
    const disabledResult = plugin.makeHook({ enabled: false });
    expect(Object.keys(disabledResult)).toHaveLength(0);

    // Test with defaults (need to explicitly set enabled since undefined is falsy)
    const defaultResult = plugin.makeHook({ command: 'test-command', enabled: true });
    expect(defaultResult.PostToolUse![0].hooks[0].command).toBe('test-command');
  });

  it('should support all hook event types', () => {
    const plugin: HookPlugin = {
      name: 'all-events-plugin',
      description: 'Plugin that supports all hook events',
      version: '1.0.0',
      makeHook: () => ({
        PreToolUse: [
          {
            matcher: 'Write',
            hooks: [{ type: 'command', command: 'pre-tool-use' }],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Write',
            hooks: [{ type: 'command', command: 'post-tool-use' }],
          },
        ],
        UserPromptSubmit: [
          {
            hooks: [{ type: 'command', command: 'user-prompt-submit' }],
          },
        ],
        Notification: [
          {
            hooks: [{ type: 'command', command: 'notification' }],
          },
        ],
        Stop: [
          {
            hooks: [{ type: 'command', command: 'stop' }],
          },
        ],
        SubagentStop: [
          {
            hooks: [{ type: 'command', command: 'subagent-stop' }],
          },
        ],
        SessionEnd: [
          {
            hooks: [{ type: 'command', command: 'session-end' }],
          },
        ],
        SessionStart: [
          {
            hooks: [{ type: 'command', command: 'session-start' }],
          },
        ],
        PreCompact: [
          {
            hooks: [{ type: 'command', command: 'pre-compact' }],
          },
        ],
      }),
    };

    const result = plugin.makeHook({});

    expect(result.PreToolUse).toBeDefined();
    expect(result.PostToolUse).toBeDefined();
    expect(result.UserPromptSubmit).toBeDefined();
    expect(result.Notification).toBeDefined();
    expect(result.Stop).toBeDefined();
    expect(result.SubagentStop).toBeDefined();
    expect(result.SessionEnd).toBeDefined();
    expect(result.SessionStart).toBeDefined();
    expect(result.PreCompact).toBeDefined();

    // Verify return types
    expectTypeOf(result.PreToolUse).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(result.PostToolUse).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(result.UserPromptSubmit).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(result.Notification).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(result.Stop).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(result.SubagentStop).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(result.SessionEnd).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(result.SessionStart).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(result.PreCompact).toEqualTypeOf<HookConfiguration[] | undefined>();
  });

  it('should support partial hook configurations', () => {
    const plugin: HookPlugin = {
      name: 'partial-plugin',
      description: 'Plugin that returns partial configurations',
      version: '1.0.0',
      makeHook: args => {
        const hooks: any = {};

        if (args.enablePreToolUse) {
          hooks.PreToolUse = [
            {
              hooks: [{ type: 'command', command: 'pre-tool-use' }],
            },
          ];
        }

        if (args.enablePostToolUse) {
          hooks.PostToolUse = [
            {
              hooks: [{ type: 'command', command: 'post-tool-use' }],
            },
          ];
        }

        return hooks;
      },
    };

    const partialResult = plugin.makeHook({ enablePreToolUse: true });
    expect(partialResult.PreToolUse).toBeDefined();
    expect(partialResult.PostToolUse).toBeUndefined();

    const fullResult = plugin.makeHook({
      enablePreToolUse: true,
      enablePostToolUse: true,
    });
    expect(fullResult.PreToolUse).toBeDefined();
    expect(fullResult.PostToolUse).toBeDefined();

    const emptyResult = plugin.makeHook({});
    expect(Object.keys(emptyResult)).toHaveLength(0);
  });

  it('should support complex hook configurations', () => {
    const plugin: HookPlugin = {
      name: 'complex-plugin',
      description: 'Plugin with complex hook configurations',
      version: '1.0.0',
      customArgs: {
        tools: {
          description: 'Tools to match',
          type: 'string',
          default: 'Write|Edit',
        },
        commands: {
          description: 'Commands to run',
          type: 'string',
          default: 'lint,test,format',
        },
        parallel: {
          description: 'Run commands in parallel',
          type: 'boolean',
          default: false,
        },
      },
      makeHook: args => {
        const tools = args.tools || 'Write|Edit';
        const commands = (args.commands || 'lint,test,format').split(',');

        return {
          PostToolUse: [
            {
              matcher: tools,
              hooks: commands.map((cmd: string, index: number) => ({
                type: 'command' as const,
                command: `npm run ${cmd.trim()}`,
                timeout: args.parallel ? 60000 : undefined,
              })),
            },
          ],
        };
      },
    };

    const result = plugin.makeHook({
      tools: 'Write|Edit|MultiEdit',
      commands: 'lint,test,build,deploy',
      parallel: true,
    });

    expect(result.PostToolUse![0].matcher).toBe('Write|Edit|MultiEdit');
    expect(result.PostToolUse![0].hooks).toHaveLength(4);
    expect(result.PostToolUse![0].hooks[0].command).toBe('npm run lint');
    expect(result.PostToolUse![0].hooks[3].command).toBe('npm run deploy');
    expect(result.PostToolUse![0].hooks[0].timeout).toBe(60000);
  });
});
