import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookCommand, HookConfiguration, HookPlugin } from './index.js';

/**
 * Basic Interface Tests - Testing core type definitions
 */

describe('HookCommand Interface', () => {
  it('should define a basic command hook correctly', () => {
    const basicCommand: HookCommand = {
      type: 'command',
      command: 'echo "Hello World"',
    };

    expectTypeOf(basicCommand).toEqualTypeOf<HookCommand>();
    expectTypeOf(basicCommand.type).toEqualTypeOf<'command'>();
    expectTypeOf(basicCommand.command).toEqualTypeOf<string>();

    expect(basicCommand.type).toBe('command');
    expect(basicCommand.command).toBe('echo "Hello World"');
  });

  it('should support optional timeout field', () => {
    const commandWithTimeout: HookCommand = {
      type: 'command',
      command: 'long-running-process',
      timeout: 30000,
    };

    expectTypeOf(commandWithTimeout.timeout).toEqualTypeOf<number | undefined>();
    expect(commandWithTimeout.timeout).toBe(30000);
  });

  it('should only accept "command" as type', () => {
    // This should compile
    const validCommand: HookCommand = {
      type: 'command',
      command: 'test',
    };

    expectTypeOf(validCommand.type).toEqualTypeOf<'command'>();

    // TypeScript should prevent invalid types at compile time
    // This would fail at compile time:
    // const invalidCommand: HookCommand = {
    //   type: 'invalid', // Type error: not assignable to 'command'
    //   command: 'test',
    // };
  });
});

describe('HookConfiguration Interface', () => {
  it('should define configuration with hooks array', () => {
    const config: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'npm run lint',
        },
      ],
    };

    expectTypeOf(config).toEqualTypeOf<HookConfiguration>();
    expectTypeOf(config.hooks).toEqualTypeOf<HookCommand[]>();
    expectTypeOf(config.matcher).toEqualTypeOf<string | undefined>();
  });

  it('should support optional matcher field', () => {
    const configWithMatcher: HookConfiguration = {
      matcher: 'Write|Edit',
      hooks: [
        {
          type: 'command',
          command: 'prettier --write',
        },
      ],
    };

    expect(configWithMatcher.matcher).toBe('Write|Edit');
  });

  it('should support multiple hook commands', () => {
    const multipleCommands: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'npm run lint',
        },
        {
          type: 'command',
          command: 'npm run test',
          timeout: 60000,
        },
      ],
    };

    expectTypeOf(multipleCommands.hooks).toEqualTypeOf<HookCommand[]>();
    expect(multipleCommands.hooks).toHaveLength(2);
  });
});

describe('HookPlugin Interface', () => {
  it('should define a complete plugin with required fields', () => {
    const plugin: HookPlugin = {
      name: 'test-plugin',
      description: 'A test plugin',
      version: '1.0.0',
      makeHook: (_args: Record<string, any>) => ({
        PreToolUse: [
          {
            hooks: [
              {
                type: 'command',
                command: 'echo test',
              },
            ],
          },
        ],
      }),
    };

    expectTypeOf(plugin).toEqualTypeOf<HookPlugin>();
    expectTypeOf(plugin.name).toEqualTypeOf<string>();
    expectTypeOf(plugin.description).toEqualTypeOf<string>();
    expectTypeOf(plugin.version).toEqualTypeOf<string>();
    expectTypeOf(plugin.makeHook).toMatchTypeOf<(args: Record<string, any>) => any>();
  });

  it('should support custom arguments definition', () => {
    const pluginWithCustomArgs: HookPlugin = {
      name: 'configurable-plugin',
      description: 'Plugin with custom arguments',
      version: '2.0.0',
      customArgs: {
        enableLinting: {
          description: 'Enable code linting',
          type: 'boolean',
          default: true,
          required: false,
        },
        lintCommand: {
          description: 'Command to run for linting',
          type: 'string',
          required: true,
        },
        timeout: {
          description: 'Timeout in milliseconds',
          type: 'number',
          default: 30000,
        },
      },
      makeHook: args => ({
        PostToolUse: [
          {
            hooks: [
              {
                type: 'command',
                command: args.lintCommand || 'npm run lint',
                timeout: args.timeout,
              },
            ],
          },
        ],
      }),
    };

    expectTypeOf(pluginWithCustomArgs.customArgs).toEqualTypeOf<
      | Record<
          string,
          {
            description: string;
            type: 'string' | 'boolean' | 'number';
            default?: any;
            required?: boolean;
          }
        >
      | undefined
    >();
  });

  it('should support all hook event types in makeHook return', () => {
    const comprehensivePlugin: HookPlugin = {
      name: 'comprehensive-plugin',
      description: 'Plugin that uses all hook types',
      version: '1.0.0',
      makeHook: _args => ({
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'echo "before tool use"' }],
          },
        ],
        PostToolUse: [
          {
            hooks: [{ type: 'command', command: 'echo "after tool use"' }],
          },
        ],
        UserPromptSubmit: [
          {
            hooks: [{ type: 'command', command: 'echo "prompt submitted"' }],
          },
        ],
        Notification: [
          {
            hooks: [{ type: 'command', command: 'echo "notification"' }],
          },
        ],
        Stop: [
          {
            hooks: [{ type: 'command', command: 'echo "stopping"' }],
          },
        ],
        SubagentStop: [
          {
            hooks: [{ type: 'command', command: 'echo "subagent stopping"' }],
          },
        ],
        SessionEnd: [
          {
            hooks: [{ type: 'command', command: 'echo "session ending"' }],
          },
        ],
        SessionStart: [
          {
            hooks: [{ type: 'command', command: 'echo "session starting"' }],
          },
        ],
        PreCompact: [
          {
            hooks: [{ type: 'command', command: 'echo "before compact"' }],
          },
        ],
      }),
    };

    const hookResult = comprehensivePlugin.makeHook({});

    // Verify all hook types are optional but correctly typed
    expectTypeOf(hookResult.PreToolUse).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hookResult.PostToolUse).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hookResult.UserPromptSubmit).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hookResult.Notification).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hookResult.Stop).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hookResult.SubagentStop).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hookResult.SessionEnd).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hookResult.SessionStart).toEqualTypeOf<HookConfiguration[] | undefined>();
    expectTypeOf(hookResult.PreCompact).toEqualTypeOf<HookConfiguration[] | undefined>();
  });
});
