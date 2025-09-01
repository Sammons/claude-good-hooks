import { describe, it, expect } from 'vitest';
import {
  isHookCommand,
  isHookConfiguration,
  isHookPlugin,
  isClaudeSettings,
  isHookMetadata,
  type HookCommand,
  type HookConfiguration,
  type HookPlugin,
  type ClaudeSettings,
  type HookMetadata,
} from './index.js';

/**
 * Type Guards Tests - Testing runtime validation functions
 */

describe('Type Guard Functions', () => {
  describe('isHookCommand', () => {
    it('should validate correct HookCommand objects', () => {
      const validCommands: HookCommand[] = [
        {
          type: 'command',
          command: 'echo "test"',
        },
        {
          type: 'command',
          command: 'npm run build',
          timeout: 30000,
        },
        {
          type: 'command',
          command: 'very-long-command-with-many-arguments --flag1 --flag2 value',
          timeout: 0,
        },
      ];

      validCommands.forEach((cmd) => {
        expect(isHookCommand(cmd)).toBe(true);
      });
    });

    it('should reject invalid HookCommand objects', () => {
      const invalidCommands = [
        null,
        undefined,
        {},
        { type: 'invalid', command: 'test' },
        { type: 'command' }, // missing command
        { command: 'test' }, // missing type
        { type: 'command', command: 123 }, // command not string
        { type: 'command', command: 'test', timeout: 'invalid' }, // timeout not number
        { type: 'command', command: '', timeout: null }, // timeout null
        'not an object',
        123,
        [],
        false,
      ];

      invalidCommands.forEach((cmd) => {
        expect(isHookCommand(cmd)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      // Empty string command should be valid
      expect(isHookCommand({
        type: 'command',
        command: '',
      })).toBe(true);

      // Zero timeout should be valid
      expect(isHookCommand({
        type: 'command',
        command: 'test',
        timeout: 0,
      })).toBe(true);

      // Negative timeout should be valid (implementation allows it)
      expect(isHookCommand({
        type: 'command',
        command: 'test',
        timeout: -1,
      })).toBe(true);

      // Very large timeout should be valid
      expect(isHookCommand({
        type: 'command',
        command: 'test',
        timeout: Number.MAX_SAFE_INTEGER,
      })).toBe(true);

      // Extra properties should not affect validation
      expect(isHookCommand({
        type: 'command',
        command: 'test',
        extraProperty: 'ignored',
      })).toBe(true);
    });
  });

  describe('isHookConfiguration', () => {
    it('should validate correct HookConfiguration objects', () => {
      const validConfigurations: HookConfiguration[] = [
        {
          hooks: [
            { type: 'command', command: 'test' },
          ],
        },
        {
          matcher: 'Write',
          hooks: [
            { type: 'command', command: 'format' },
            { type: 'command', command: 'lint', timeout: 30000 },
          ],
        },
        {
          matcher: '',
          hooks: [],
        },
      ];

      validConfigurations.forEach((config) => {
        expect(isHookConfiguration(config)).toBe(true);
      });
    });

    it('should reject invalid HookConfiguration objects', () => {
      const invalidConfigurations = [
        null,
        undefined,
        {},
        { hooks: 'not an array' },
        { hooks: [{ type: 'invalid', command: 'test' }] }, // invalid hook command
        { hooks: [null] }, // invalid hook command
        { hooks: [{ type: 'command', command: 'test' }, 'invalid'] }, // mixed valid/invalid
        { matcher: 123, hooks: [] }, // matcher not string
        'not an object',
        [],
      ];

      invalidConfigurations.forEach((config) => {
        expect(isHookConfiguration(config)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      // Empty hooks array should be valid
      expect(isHookConfiguration({
        hooks: [],
      })).toBe(true);

      // Empty string matcher should be valid
      expect(isHookConfiguration({
        matcher: '',
        hooks: [{ type: 'command', command: 'test' }],
      })).toBe(true);

      // Missing matcher should be valid
      expect(isHookConfiguration({
        hooks: [{ type: 'command', command: 'test' }],
      })).toBe(true);

      // Complex regex matcher should be valid
      expect(isHookConfiguration({
        matcher: '^(Write|Edit)$|Notebook.*',
        hooks: [{ type: 'command', command: 'test' }],
      })).toBe(true);
    });
  });

  describe('isHookPlugin', () => {
    it('should validate correct HookPlugin objects', () => {
      const validPlugins: HookPlugin[] = [
        {
          name: 'test-plugin',
          description: 'A test plugin',
          version: '1.0.0',
          makeHook: () => ({}),
        },
        {
          name: 'complex-plugin',
          description: 'A more complex plugin',
          version: '2.1.0-beta.1',
          customArgs: {
            stringArg: {
              description: 'A string argument',
              type: 'string',
              default: 'default',
              required: true,
            },
            booleanArg: {
              description: 'A boolean argument',
              type: 'boolean',
            },
            numberArg: {
              description: 'A number argument',
              type: 'number',
              default: 42,
              required: false,
            },
          },
          makeHook: (args) => ({
            PreToolUse: [
              {
                hooks: [{ type: 'command', command: args.stringArg || 'default' }],
              },
            ],
          }),
        },
      ];

      validPlugins.forEach((plugin) => {
        expect(isHookPlugin(plugin)).toBe(true);
      });
    });

    it('should reject invalid HookPlugin objects', () => {
      const invalidPlugins = [
        null,
        undefined,
        {},
        { name: 'test' }, // missing required fields
        { name: 'test', description: 'desc' }, // missing version and makeHook
        { name: 'test', description: 'desc', version: '1.0.0' }, // missing makeHook
        { name: 123, description: 'desc', version: '1.0.0', makeHook: () => ({}) }, // name not string
        { name: 'test', description: 123, version: '1.0.0', makeHook: () => ({}) }, // description not string
        { name: 'test', description: 'desc', version: 123, makeHook: () => ({}) }, // version not string
        { name: 'test', description: 'desc', version: '1.0.0', makeHook: 'not a function' },
        {
          name: 'test',
          description: 'desc',
          version: '1.0.0',
          makeHook: () => ({}),
          customArgs: 'invalid', // customArgs not object
        },
        {
          name: 'test',
          description: 'desc',
          version: '1.0.0',
          makeHook: () => ({}),
          customArgs: {
            invalidArg: 'not valid arg definition',
          },
        },
      ];

      invalidPlugins.forEach((plugin) => {
        expect(isHookPlugin(plugin)).toBe(false);
      });
    });

    it('should validate customArgs structure', () => {
      // Valid customArgs
      const validCustomArgs = {
        stringArg: {
          description: 'String argument',
          type: 'string',
          default: 'default',
          required: true,
        },
        booleanArg: {
          description: 'Boolean argument',
          type: 'boolean',
          required: false,
        },
        numberArg: {
          description: 'Number argument',
          type: 'number',
        },
      };

      expect(isHookPlugin({
        name: 'test',
        description: 'test',
        version: '1.0.0',
        customArgs: validCustomArgs,
        makeHook: () => ({}),
      })).toBe(true);

      // Invalid customArgs
      const invalidCustomArgsVariations = [
        {
          invalidArg: {
            description: 'Invalid type',
            type: 'invalid-type', // not string|boolean|number
          },
        },
        {
          missingDescription: {
            type: 'string',
          },
        },
        {
          missingType: {
            description: 'Missing type',
          },
        },
        {
          invalidRequired: {
            description: 'Invalid required',
            type: 'string',
            required: 'not a boolean',
          },
        },
      ];

      invalidCustomArgsVariations.forEach((customArgs) => {
        expect(isHookPlugin({
          name: 'test',
          description: 'test',
          version: '1.0.0',
          customArgs,
          makeHook: () => ({}),
        })).toBe(false);
      });
    });
  });

  describe('isClaudeSettings', () => {
    it('should validate correct ClaudeSettings objects', () => {
      const validSettings: ClaudeSettings[] = [
        {}, // empty settings
        { hooks: {} }, // empty hooks
        {
          hooks: {
            PreToolUse: [
              {
                matcher: 'Write',
                hooks: [{ type: 'command', command: 'test' }],
              },
            ],
          },
        },
        {
          hooks: {
            PreToolUse: [],
            PostToolUse: [
              {
                hooks: [
                  { type: 'command', command: 'test1' },
                  { type: 'command', command: 'test2', timeout: 5000 },
                ],
              },
            ],
            UserPromptSubmit: [],
            Notification: [],
            Stop: [],
            SubagentStop: [],
            SessionEnd: [],
            SessionStart: [],
            PreCompact: [],
          },
        },
      ];

      validSettings.forEach((settings) => {
        expect(isClaudeSettings(settings)).toBe(true);
      });
    });

    it('should reject invalid ClaudeSettings objects', () => {
      const invalidSettings = [
        null,
        undefined,
        'not an object',
        123,
        [],
        { hooks: 'not an object' },
        { hooks: null },
        {
          hooks: {
            InvalidHookType: [], // not a valid hook type
          },
        },
        {
          hooks: {
            PreToolUse: 'not an array',
          },
        },
        {
          hooks: {
            PreToolUse: [
              'not a hook configuration',
            ],
          },
        },
        {
          hooks: {
            PreToolUse: [
              { hooks: [{ type: 'invalid', command: 'test' }] }, // invalid hook command
            ],
          },
        },
        // Add objects with other invalid properties
        { invalidProperty: 'value', hooks: {} },
      ];

      invalidSettings.forEach((settings) => {
        expect(isClaudeSettings(settings)).toBe(false);
      });
    });

    it('should validate all hook event types', () => {
      const validHookTypes = [
        'PreToolUse',
        'PostToolUse',
        'UserPromptSubmit',
        'Notification',
        'Stop',
        'SubagentStop',
        'SessionEnd',
        'SessionStart',
        'PreCompact',
      ];

      validHookTypes.forEach((hookType) => {
        const settings = {
          hooks: {
            [hookType]: [
              {
                hooks: [{ type: 'command', command: 'test' }],
              },
            ],
          },
        };

        expect(isClaudeSettings(settings)).toBe(true);
      });

      // Test invalid hook type
      const invalidSettings = {
        hooks: {
          InvalidHookType: [],
        },
      };

      expect(isClaudeSettings(invalidSettings)).toBe(false);
    });

    it('should handle complex nested structures', () => {
      const complexSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Write|Edit',
              hooks: [
                { type: 'command', command: 'pre-command-1' },
                { type: 'command', command: 'pre-command-2', timeout: 30000 },
              ],
            },
            {
              hooks: [
                { type: 'command', command: 'global-pre-command' },
              ],
            },
          ],
          PostToolUse: [
            {
              matcher: 'mcp__.*__write.*',
              hooks: [
                { type: 'command', command: 'mcp-write-handler', timeout: 60000 },
              ],
            },
          ],
        },
      };

      expect(isClaudeSettings(complexSettings)).toBe(true);
    });
  });

  describe('isHookMetadata', () => {
    it('should validate correct HookMetadata objects', () => {
      const validMetadata: HookMetadata[] = [
        {
          name: 'test-hook',
          description: 'A test hook',
          version: '1.0.0',
          source: 'local',
          installed: true,
        },
        {
          name: 'global-hook',
          description: 'A global hook',
          version: '2.1.0',
          source: 'global',
          installed: false,
          packageName: '@scope/hook-name',
        },
        {
          name: 'remote-hook',
          description: 'A remote hook',
          version: '3.0.0-beta.1',
          source: 'remote',
          installed: true,
          packageName: 'remote-hook-package',
        },
      ];

      validMetadata.forEach((metadata) => {
        expect(isHookMetadata(metadata)).toBe(true);
      });
    });

    it('should reject invalid HookMetadata objects', () => {
      const invalidMetadata = [
        null,
        undefined,
        {},
        { name: 'test' }, // missing required fields
        { name: 123, description: 'desc', version: '1.0.0', source: 'local', installed: true }, // name not string
        { name: 'test', description: 123, version: '1.0.0', source: 'local', installed: true }, // description not string
        { name: 'test', description: 'desc', version: 123, source: 'local', installed: true }, // version not string
        { name: 'test', description: 'desc', version: '1.0.0', source: 'invalid', installed: true }, // invalid source
        { name: 'test', description: 'desc', version: '1.0.0', source: 'local', installed: 'invalid' }, // installed not boolean
        {
          name: 'test',
          description: 'desc',
          version: '1.0.0',
          source: 'local',
          installed: true,
          packageName: 123, // packageName not string
        },
        'not an object',
        123,
        [],
      ];

      invalidMetadata.forEach((metadata) => {
        expect(isHookMetadata(metadata)).toBe(false);
      });
    });

    it('should validate source types', () => {
      const validSources = ['local', 'global', 'remote'];
      const invalidSources = ['invalid', 'LOCAL', 'Global', 'REMOTE', '', null, undefined, 123];

      validSources.forEach((source) => {
        expect(isHookMetadata({
          name: 'test',
          description: 'desc',
          version: '1.0.0',
          source: source as any,
          installed: true,
        })).toBe(true);
      });

      invalidSources.forEach((source) => {
        expect(isHookMetadata({
          name: 'test',
          description: 'desc',
          version: '1.0.0',
          source: source as any,
          installed: true,
        })).toBe(false);
      });
    });

    it('should handle optional packageName', () => {
      // Without packageName
      expect(isHookMetadata({
        name: 'test',
        description: 'desc',
        version: '1.0.0',
        source: 'local',
        installed: true,
      })).toBe(true);

      // With valid packageName
      expect(isHookMetadata({
        name: 'test',
        description: 'desc',
        version: '1.0.0',
        source: 'remote',
        installed: true,
        packageName: '@scope/package-name',
      })).toBe(true);

      // With invalid packageName
      expect(isHookMetadata({
        name: 'test',
        description: 'desc',
        version: '1.0.0',
        source: 'remote',
        installed: true,
        packageName: 123 as any,
      })).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should work with real-world data structures', () => {
      const realWorldSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write|Edit|MultiEdit',
              hooks: [
                {
                  type: 'command',
                  command: 'prettier --write $CLAUDE_PROJECT_DIR',
                  timeout: 30000,
                },
                {
                  type: 'command',
                  command: 'eslint --fix $CLAUDE_PROJECT_DIR --ext .ts,.js',
                  timeout: 60000,
                },
              ],
            },
          ],
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'validate-command.py',
                  timeout: 10000,
                },
              ],
            },
          ],
        },
      };

      expect(isClaudeSettings(realWorldSettings)).toBe(true);

      // Test individual components
      const hookConfig = realWorldSettings.hooks!.PostToolUse![0];
      expect(isHookConfiguration(hookConfig)).toBe(true);

      const hookCommand = hookConfig.hooks[0];
      expect(isHookCommand(hookCommand)).toBe(true);
    });

    it('should work with complex plugin structures', () => {
      const complexPlugin: HookPlugin = {
        name: 'auto-formatter',
        description: 'Automatically format code after file modifications',
        version: '1.2.3',
        customArgs: {
          languages: {
            description: 'Languages to format',
            type: 'string',
            default: 'typescript,javascript',
            required: false,
          },
          timeout: {
            description: 'Formatting timeout',
            type: 'number',
            default: 30000,
          },
          enabled: {
            description: 'Enable formatting',
            type: 'boolean',
            default: true,
            required: true,
          },
        },
        makeHook: (args) => ({
          PostToolUse: [
            {
              matcher: 'Write|Edit',
              hooks: [
                {
                  type: 'command',
                  command: `format-code --languages=${args.languages || 'typescript,javascript'}`,
                  timeout: args.timeout || 30000,
                },
              ],
            },
          ],
        }),
      };

      expect(isHookPlugin(complexPlugin)).toBe(true);

      const hookResult = complexPlugin.makeHook({ enabled: true });
      expect(isClaudeSettings({ hooks: hookResult })).toBe(true);
    });

    it('should handle metadata validation for package management', () => {
      const packageMetadata: HookMetadata[] = [
        {
          name: 'local-dev-hook',
          description: 'Local development utilities',
          version: '0.1.0-dev',
          source: 'local',
          installed: true,
        },
        {
          name: 'company-standards',
          description: 'Company coding standards enforcement',
          version: '2.1.0',
          source: 'global',
          installed: true,
          packageName: '@company/claude-hooks-standards',
        },
        {
          name: 'popular-formatter',
          description: 'Popular community formatter',
          version: '3.5.1',
          source: 'remote',
          installed: false,
          packageName: 'claude-hooks-formatter',
        },
      ];

      packageMetadata.forEach((metadata) => {
        expect(isHookMetadata(metadata)).toBe(true);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle deeply nested structures efficiently', () => {
      const deepSettings = {
        hooks: {
          PreToolUse: Array.from({ length: 100 }, (_, i) => ({
            matcher: `Tool${i}`,
            hooks: Array.from({ length: 10 }, (_, j) => ({
              type: 'command' as const,
              command: `command-${i}-${j}`,
              timeout: (i + j) * 1000,
            })),
          })),
        },
      };

      const startTime = Date.now();
      const result = isClaudeSettings(deepSettings);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should handle malformed data gracefully', () => {
      const malformedData = [
        null,
        undefined,
        0,
        '',
        false,
        NaN,
        Infinity,
        -Infinity,
        Symbol('test'),
        new Date(),
        new RegExp('test'),
        () => {},
        Promise.resolve({}),
      ];

      malformedData.forEach((data) => {
        expect(() => isHookCommand(data)).not.toThrow();
        expect(() => isHookConfiguration(data)).not.toThrow();
        expect(() => isHookPlugin(data)).not.toThrow();
        expect(() => isClaudeSettings(data)).not.toThrow();
        expect(() => isHookMetadata(data)).not.toThrow();

        expect(isHookCommand(data)).toBe(false);
        expect(isHookConfiguration(data)).toBe(false);
        expect(isHookPlugin(data)).toBe(false);
        // Empty object {} is valid ClaudeSettings, but these malformed objects are not
        if (data !== null && typeof data === 'object' && Object.keys(data as object).length === 0) {
          expect(isClaudeSettings(data)).toBe(true);
        } else {
          expect(isClaudeSettings(data)).toBe(false);
        }
        expect(isHookMetadata(data)).toBe(false);
      });
    });

    it('should handle circular references safely', () => {
      const circularObject: any = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        source: 'local',
        installed: true,
      };
      circularObject.self = circularObject;

      // Should not throw, but circular object actually passes basic validation 
      // since our type guards don't do deep traversal
      expect(() => isHookMetadata(circularObject)).not.toThrow();
      // The circular reference doesn't affect the basic property validation
      expect(isHookMetadata(circularObject)).toBe(true);
    });
  });
});