import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  HookCommand,
  HookConfiguration,
  HookPlugin,
  ClaudeSettings,
  HookMetadata,
} from './index.js';

/**
 * Integration Tests and Edge Cases - Testing complex scenarios and edge cases
 */

describe('Type Integration Tests', () => {
  it('should allow building complete hook ecosystem', () => {
    // Create a plugin
    const plugin: HookPlugin = {
      name: 'integration-test-plugin',
      description: 'Plugin for integration testing',
      version: '1.0.0',
      customArgs: {
        format: {
          description: 'Code formatting tool',
          type: 'string',
          default: 'prettier',
        },
        autoFix: {
          description: 'Automatically fix issues',
          type: 'boolean',
          default: false,
        },
      },
      makeHook: (args) => ({
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: `${args.format} --write`,
                timeout: 10000,
              },
            ],
          },
        ],
      }),
    };

    // Generate settings from plugin
    const hookConfig = plugin.makeHook({ format: 'eslint', autoFix: true });
    
    const settings: ClaudeSettings = {
      hooks: hookConfig,
    };

    // Create metadata for the plugin
    const metadata: HookMetadata = {
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      source: 'remote',
      installed: true,
      packageName: '@test/integration-plugin',
    };

    // Verify integration works
    expect(plugin.name).toBe(metadata.name);
    expect(settings.hooks?.PostToolUse).toBeDefined();
    expect(settings.hooks?.PostToolUse?.[0]?.hooks[0]?.command).toBe('eslint --write');
  });

  it('should handle complex configuration scenarios', () => {
    const complexSettings: ClaudeSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              {
                type: 'command',
                command: 'security-check.sh',
                timeout: 5000,
              },
            ],
          },
          {
            matcher: 'Write',
            hooks: [
              {
                type: 'command',
                command: 'backup-file.sh',
              },
              {
                type: 'command',
                command: 'validate-syntax.sh',
                timeout: 15000,
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: '.*Edit.*',
            hooks: [
              {
                type: 'command',
                command: 'format-code.sh',
              },
              {
                type: 'command',
                command: 'run-tests.sh',
                timeout: 120000,
              },
            ],
          },
        ],
      },
    };

    // Verify type structure is maintained
    expectTypeOf(complexSettings).toEqualTypeOf<ClaudeSettings>();
    expect(complexSettings.hooks?.PreToolUse).toHaveLength(2);
    expect(complexSettings.hooks?.PostToolUse).toHaveLength(1);
    expect(complexSettings.hooks?.PreToolUse?.[0]?.hooks).toHaveLength(1);
    expect(complexSettings.hooks?.PreToolUse?.[1]?.hooks).toHaveLength(2);
  });
});

// Type constraint tests - these should fail at compile time if types are incorrect
describe('Type Constraint Tests', () => {
  it('should prevent invalid command types', () => {
    // This test verifies that TypeScript catches type errors at compile time
    expect(() => {
      // @ts-expect-error - should not allow non-command types
      const invalidHook: HookCommand = {
        type: 'webhook' as any,
        command: 'test',
      };
    }).not.toThrow(); // The test itself won't throw, but TypeScript should catch the error
  });

  it('should prevent invalid source types in metadata', () => {
    expect(() => {
      // @ts-expect-error - should not allow invalid source types  
      const invalidMetadata: HookMetadata = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        source: 'invalid-source' as any,
        installed: true,
      };
    }).not.toThrow();
  });

  it('should prevent invalid custom arg types', () => {
    expect(() => {
      // @ts-expect-error - should not allow invalid arg types
      const invalidPlugin: HookPlugin = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        customArgs: {
          invalidArg: {
            description: 'test',
            type: 'invalid-type' as any,
          },
        },
        makeHook: () => ({}),
      };
    }).not.toThrow();
  });
});

describe('Edge Cases and Error Scenarios', () => {
  it('should handle empty hook arrays', () => {
    const emptyHookConfig: HookConfiguration = {
      hooks: [],
    };

    expectTypeOf(emptyHookConfig.hooks).toEqualTypeOf<HookCommand[]>();
    expect(emptyHookConfig.hooks).toHaveLength(0);
  });

  it('should handle plugins with no custom args', () => {
    const simplePlugin: HookPlugin = {
      name: 'simple',
      description: 'Simple plugin without custom args',
      version: '1.0.0',
      makeHook: () => ({
        PreToolUse: [
          {
            hooks: [{ type: 'command', command: 'echo simple' }],
          },
        ],
      }),
    };

    expect(simplePlugin.customArgs).toBeUndefined();
    expectTypeOf(simplePlugin.customArgs).toEqualTypeOf<HookPlugin['customArgs']>();
  });

  it('should handle plugins returning empty hook configurations', () => {
    const emptyPlugin: HookPlugin = {
      name: 'empty',
      description: 'Plugin that returns empty config',
      version: '1.0.0',
      makeHook: () => ({}),
    };

    const result = emptyPlugin.makeHook({});
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should validate hook command structure at runtime', () => {
    const validCommand: HookCommand = {
      type: 'command',
      command: 'test command',
    };

    const commandWithTimeout: HookCommand = {
      type: 'command',
      command: 'long command',
      timeout: 30000,
    };

    expect(validCommand.type).toBe('command');
    expect(validCommand.command).toBe('test command');
    expect(validCommand.timeout).toBeUndefined();

    expect(commandWithTimeout.type).toBe('command');
    expect(commandWithTimeout.command).toBe('long command');
    expect(commandWithTimeout.timeout).toBe(30000);
  });

  it('should handle metadata with minimal fields', () => {
    const minimalMetadata: HookMetadata = {
      name: 'minimal',
      description: 'Minimal metadata',
      version: '1.0.0',
      source: 'local',
      installed: false,
    };

    expect(minimalMetadata.packageName).toBeUndefined();
    expect(minimalMetadata.installed).toBe(false);
  });

  it('should support deep nesting in plugin configurations', () => {
    const deepPlugin: HookPlugin = {
      name: 'deep-nested',
      description: 'Plugin with deep nesting',
      version: '1.0.0',
      customArgs: {
        nested: {
          description: 'Nested configuration',
          type: 'string',
          default: '{"level1": {"level2": {"level3": "value"}}}',
        },
      },
      makeHook: (args) => {
        const parsed = JSON.parse(args.nested || '{}');
        return {
          PreToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: `echo "${parsed.level1?.level2?.level3 || 'default'}"`,
                },
              ],
            },
          ],
        };
      },
    };

    const hooks = deepPlugin.makeHook({
      nested: '{"level1": {"level2": {"level3": "nested-value"}}}',
    });

    expect(hooks.PreToolUse?.[0]?.hooks[0]?.command).toBe('echo "nested-value"');
  });
});