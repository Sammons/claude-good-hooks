import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookPlugin, HookConfiguration } from './index.js';

/**
 * Hook Plugin Tests - Testing HookPlugin interface with complex scenarios
 */

describe('HookPlugin Interface', () => {
  describe('Required Properties', () => {
    it('should enforce all required string properties', () => {
      const plugin: HookPlugin = {
        name: 'test-plugin',
        description: 'A comprehensive test plugin',
        version: '1.0.0',
        makeHook: () => ({}),
      };

      expectTypeOf(plugin.name).toEqualTypeOf<string>();
      expectTypeOf(plugin.description).toEqualTypeOf<string>();
      expectTypeOf(plugin.version).toEqualTypeOf<string>();
      expectTypeOf(plugin.makeHook).toMatchTypeOf<(args: Record<string, any>) => any>();

      expect(typeof plugin.name).toBe('string');
      expect(typeof plugin.description).toBe('string');
      expect(typeof plugin.version).toBe('string');
      expect(typeof plugin.makeHook).toBe('function');
    });

    it('should accept various name patterns', () => {
      const namePatterns = [
        'simple-plugin',
        'my_plugin',
        'MyPlugin',
        'plugin123',
        'namespaced/plugin',
        '@scope/plugin-name',
        'very-long-plugin-name-with-multiple-hyphens',
      ];

      namePatterns.forEach((name) => {
        const plugin: HookPlugin = {
          name,
          description: 'Test plugin',
          version: '1.0.0',
          makeHook: () => ({}),
        };

        expect(plugin.name).toBe(name);
      });
    });

    it('should accept various description lengths', () => {
      const descriptions = [
        'Short',
        'Medium length description',
        'A very detailed and comprehensive description that explains exactly what this plugin does, how it works, and when it should be used in various development scenarios.',
        '', // Empty description
      ];

      descriptions.forEach((description) => {
        const plugin: HookPlugin = {
          name: 'test-plugin',
          description,
          version: '1.0.0',
          makeHook: () => ({}),
        };

        expect(plugin.description).toBe(description);
      });
    });

    it('should accept various version formats', () => {
      const versions = [
        '1.0.0',
        '0.1.0',
        '10.20.30',
        '1.0.0-alpha',
        '1.0.0-alpha.1',
        '1.0.0-beta.2',
        '1.0.0-rc.1',
        '2.0.0-next.3',
        'v1.0.0',
        '1.0',
        'latest',
        'dev',
        '2023.12.25',
      ];

      versions.forEach((version) => {
        const plugin: HookPlugin = {
          name: 'version-test-plugin',
          description: 'Testing version formats',
          version,
          makeHook: () => ({}),
        };

        expect(plugin.version).toBe(version);
      });
    });
  });

  describe('Custom Arguments', () => {
    it('should support all argument types with all properties', () => {
      const plugin: HookPlugin = {
        name: 'comprehensive-args-plugin',
        description: 'Plugin testing all argument features',
        version: '1.0.0',
        customArgs: {
          stringParam: {
            description: 'A string parameter',
            type: 'string',
            default: 'default-value',
            required: true,
          },
          booleanParam: {
            description: 'A boolean parameter',
            type: 'boolean',
            default: false,
            required: false,
          },
          numberParam: {
            description: 'A numeric parameter',
            type: 'number',
            default: 42,
          },
          optionalString: {
            description: 'Optional string without default',
            type: 'string',
            required: false,
          },
          requiredNumber: {
            description: 'Required number without default',
            type: 'number',
            required: true,
          },
        },
        makeHook: () => ({}),
      };

      const customArgs = plugin.customArgs!;
      
      expect(customArgs.stringParam.type).toBe('string');
      expect(customArgs.stringParam.required).toBe(true);
      expect(customArgs.stringParam.default).toBe('default-value');

      expect(customArgs.booleanParam.type).toBe('boolean');
      expect(customArgs.booleanParam.required).toBe(false);
      expect(customArgs.booleanParam.default).toBe(false);

      expect(customArgs.numberParam.type).toBe('number');
      expect(customArgs.numberParam.default).toBe(42);
      expect(customArgs.numberParam.required).toBeUndefined();

      expect(customArgs.optionalString.required).toBe(false);
      expect(customArgs.optionalString.default).toBeUndefined();

      expect(customArgs.requiredNumber.required).toBe(true);
      expect(customArgs.requiredNumber.default).toBeUndefined();
    });

    it('should support minimal argument definitions', () => {
      const plugin: HookPlugin = {
        name: 'minimal-args-plugin',
        description: 'Plugin with minimal argument definitions',
        version: '1.0.0',
        customArgs: {
          simpleString: {
            description: 'Simple string argument',
            type: 'string',
          },
          simpleBoolean: {
            description: 'Simple boolean argument',
            type: 'boolean',
          },
          simpleNumber: {
            description: 'Simple number argument',
            type: 'number',
          },
        },
        makeHook: () => ({}),
      };

      const customArgs = plugin.customArgs!;
      
      Object.values(customArgs).forEach((arg) => {
        expect(arg.description).toBeDefined();
        expect(['string', 'boolean', 'number']).toContain(arg.type);
        expect(arg.default).toBeUndefined();
        expect(arg.required).toBeUndefined();
      });
    });

    it('should support complex argument names and descriptions', () => {
      const plugin: HookPlugin = {
        name: 'complex-args-plugin',
        description: 'Plugin with complex argument definitions',
        version: '1.0.0',
        customArgs: {
          'kebab-case-arg': {
            description: 'Argument with kebab-case name',
            type: 'string',
          },
          snake_case_arg: {
            description: 'Argument with snake_case name',
            type: 'boolean',
          },
          camelCaseArg: {
            description: 'Argument with camelCase name',
            type: 'number',
          },
          'arg_with-mixed_CASE': {
            description: 'A very detailed description that explains the purpose of this argument, its expected values, and how it affects the plugin behavior in various scenarios.',
            type: 'string',
            default: 'complex-default-value',
          },
        },
        makeHook: () => ({}),
      };

      const customArgs = plugin.customArgs!;
      expect(Object.keys(customArgs)).toHaveLength(4);
      expect(customArgs['kebab-case-arg']).toBeDefined();
      expect(customArgs.snake_case_arg).toBeDefined();
      expect(customArgs.camelCaseArg).toBeDefined();
      expect(customArgs['arg_with-mixed_CASE']).toBeDefined();
    });

    it('should support default values of various types', () => {
      const plugin: HookPlugin = {
        name: 'default-values-plugin',
        description: 'Plugin testing various default values',
        version: '1.0.0',
        customArgs: {
          stringWithString: {
            description: 'String with string default',
            type: 'string',
            default: 'string-default',
          },
          stringWithNumber: {
            description: 'String with number default (should be allowed)',
            type: 'string',
            default: 123,
          },
          booleanWithBoolean: {
            description: 'Boolean with boolean default',
            type: 'boolean',
            default: true,
          },
          booleanWithString: {
            description: 'Boolean with string default (should be allowed)',
            type: 'boolean',
            default: 'true',
          },
          numberWithNumber: {
            description: 'Number with number default',
            type: 'number',
            default: 3.14,
          },
          numberWithString: {
            description: 'Number with string default (should be allowed)',
            type: 'number',
            default: '42',
          },
          arrayDefault: {
            description: 'Argument with array default',
            type: 'string',
            default: ['a', 'b', 'c'],
          },
          objectDefault: {
            description: 'Argument with object default',
            type: 'string',
            default: { key: 'value' },
          },
          nullDefault: {
            description: 'Argument with null default',
            type: 'string',
            default: null,
          },
        },
        makeHook: () => ({}),
      };

      const customArgs = plugin.customArgs!;
      expect(customArgs.stringWithString.default).toBe('string-default');
      expect(customArgs.stringWithNumber.default).toBe(123);
      expect(customArgs.booleanWithBoolean.default).toBe(true);
      expect(customArgs.booleanWithString.default).toBe('true');
      expect(customArgs.numberWithNumber.default).toBe(3.14);
      expect(customArgs.numberWithString.default).toBe('42');
      expect(Array.isArray(customArgs.arrayDefault.default)).toBe(true);
      expect(typeof customArgs.objectDefault.default).toBe('object');
      expect(customArgs.nullDefault.default).toBe(null);
    });

    it('should handle plugins without custom arguments', () => {
      const plugin: HookPlugin = {
        name: 'no-args-plugin',
        description: 'Plugin without custom arguments',
        version: '1.0.0',
        makeHook: () => ({}),
      };

      expect(plugin.customArgs).toBeUndefined();
      expectTypeOf(plugin.customArgs).toEqualTypeOf<
        Record<
          string,
          {
            description: string;
            type: 'string' | 'boolean' | 'number';
            default?: any;
            required?: boolean;
          }
        > | undefined
      >();
    });
  });

  describe('makeHook Function', () => {
    it('should accept empty arguments and return valid hook configurations', () => {
      const plugin: HookPlugin = {
        name: 'empty-args-plugin',
        description: 'Plugin that works with empty args',
        version: '1.0.0',
        makeHook: (args) => {
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
        makeHook: (args) => {
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
        makeHook: (args) => {
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
        makeHook: (args) => {
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

  describe('Real-world Plugin Examples', () => {
    it('should support a code formatting plugin', () => {
      const formatterPlugin: HookPlugin = {
        name: 'code-formatter',
        description: 'Automatically format code after file modifications',
        version: '1.2.0',
        customArgs: {
          languages: {
            description: 'Programming languages to format',
            type: 'string',
            default: 'typescript,javascript,python',
          },
          prettierConfig: {
            description: 'Path to prettier configuration',
            type: 'string',
            default: '.prettierrc',
          },
          eslintFix: {
            description: 'Run ESLint with auto-fix',
            type: 'boolean',
            default: true,
          },
        },
        makeHook: (args) => {
          const hooks = [
            {
              type: 'command' as const,
              command: `prettier --config ${args.prettierConfig || '.prettierrc'} --write .`,
              timeout: 30000,
            },
          ];

          if (args.eslintFix !== false) {
            hooks.push({
              type: 'command' as const,
              command: 'eslint --fix --ext .ts,.js .',
              timeout: 60000,
            });
          }

          return {
            PostToolUse: [
              {
                matcher: 'Write|Edit|MultiEdit',
                hooks,
              },
            ],
          };
        },
      };

      const result = formatterPlugin.makeHook({
        eslintFix: true,
        prettierConfig: 'custom.prettierrc',
      });

      expect(result.PostToolUse![0].hooks).toHaveLength(2);
      expect(result.PostToolUse![0].hooks[0].command).toContain('custom.prettierrc');
    });

    it('should support a testing plugin', () => {
      const testingPlugin: HookPlugin = {
        name: 'auto-tester',
        description: 'Run tests automatically when files change',
        version: '2.0.1',
        customArgs: {
          testCommand: {
            description: 'Test command to run',
            type: 'string',
            default: 'npm test',
          },
          watchMode: {
            description: 'Run tests in watch mode',
            type: 'boolean',
            default: false,
          },
          coverage: {
            description: 'Generate coverage report',
            type: 'boolean',
            default: true,
          },
          timeout: {
            description: 'Test timeout in milliseconds',
            type: 'number',
            default: 300000,
          },
        },
        makeHook: (args) => {
          let command = args.testCommand || 'npm test';
          
          if (args.coverage) {
            command += ' -- --coverage';
          }
          
          if (args.watchMode) {
            command += ' --watch';
          }

          return {
            PostToolUse: [
              {
                matcher: 'Write|Edit',
                hooks: [
                  {
                    type: 'command',
                    command,
                    timeout: args.timeout || 300000,
                  },
                ],
              },
            ],
          };
        },
      };

      const result = testingPlugin.makeHook({
        testCommand: 'yarn test',
        coverage: true,
        watchMode: false,
        timeout: 120000,
      });

      expect(result.PostToolUse![0].hooks[0].command).toBe('yarn test -- --coverage');
      expect(result.PostToolUse![0].hooks[0].timeout).toBe(120000);
    });

    it('should support a git integration plugin', () => {
      const gitPlugin: HookPlugin = {
        name: 'git-integration',
        description: 'Automatic git operations for file changes',
        version: '3.1.0',
        customArgs: {
          autoCommit: {
            description: 'Automatically commit changes',
            type: 'boolean',
            default: false,
          },
          commitMessage: {
            description: 'Commit message template',
            type: 'string',
            default: 'Auto-commit: Claude Code changes',
          },
          autoStage: {
            description: 'Automatically stage changes',
            type: 'boolean',
            default: true,
          },
          pushAfterCommit: {
            description: 'Push changes after commit',
            type: 'boolean',
            default: false,
          },
        },
        makeHook: (args) => {
          const hooks = [];

          if (args.autoStage !== false) {
            hooks.push({
              type: 'command' as const,
              command: 'git add -A',
              timeout: 10000,
            });
          }

          if (args.autoCommit) {
            hooks.push({
              type: 'command' as const,
              command: `git diff --staged --quiet || git commit -m "${args.commitMessage || 'Auto-commit: Claude Code changes'}"`,
              timeout: 15000,
            });

            if (args.pushAfterCommit) {
              hooks.push({
                type: 'command' as const,
                command: 'git push',
                timeout: 30000,
              });
            }
          }

          return hooks.length > 0
            ? {
                PostToolUse: [
                  {
                    matcher: 'Write|Edit|MultiEdit',
                    hooks,
                  },
                ],
              }
            : {};
        },
      };

      const fullResult = gitPlugin.makeHook({
        autoCommit: true,
        commitMessage: 'feat: new feature',
        pushAfterCommit: true,
      });

      expect(fullResult.PostToolUse![0].hooks).toHaveLength(3);
      expect(fullResult.PostToolUse![0].hooks[1].command).toContain('feat: new feature');

      const minimalResult = gitPlugin.makeHook({ autoStage: false });
      expect(Object.keys(minimalResult)).toHaveLength(0);
    });

    it('should support a notification plugin', () => {
      const notificationPlugin: HookPlugin = {
        name: 'smart-notifications',
        description: 'Context-aware notifications for Claude Code events',
        version: '1.0.0',
        customArgs: {
          notifyOnComplete: {
            description: 'Send notification when tasks complete',
            type: 'boolean',
            default: true,
          },
          notifyOnError: {
            description: 'Send notification on errors',
            type: 'boolean',
            default: true,
          },
          soundEnabled: {
            description: 'Play sound with notifications',
            type: 'boolean',
            default: false,
          },
        },
        makeHook: (args) => {
          const hooks = [];

          if (args.notifyOnComplete !== false) {
            hooks.push({
              type: 'command' as const,
              command: 'osascript -e "display notification \\"Task completed\\" with title \\"Claude Code\\""',
            });
          }

          if (args.soundEnabled) {
            hooks.push({
              type: 'command' as const,
              command: 'osascript -e "beep"',
            });
          }

          return {
            Stop: [
              {
                hooks,
              },
            ],
            SessionEnd: [
              {
                hooks: [
                  {
                    type: 'command',
                    command: 'osascript -e "display notification \\"Session ended\\" with title \\"Claude Code\\""',
                  },
                ],
              },
            ],
          };
        },
      };

      const result = notificationPlugin.makeHook({
        notifyOnComplete: true,
        soundEnabled: true,
      });

      expect(result.Stop![0].hooks).toHaveLength(2);
      expect(result.SessionEnd![0].hooks).toHaveLength(1);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle makeHook function that throws errors', () => {
      const errorPlugin: HookPlugin = {
        name: 'error-plugin',
        description: 'Plugin that throws errors',
        version: '1.0.0',
        makeHook: (args) => {
          if (args.shouldThrow) {
            throw new Error('Plugin error');
          }
          return {};
        },
      };

      expect(() => errorPlugin.makeHook({ shouldThrow: false })).not.toThrow();
      expect(() => errorPlugin.makeHook({ shouldThrow: true })).toThrow('Plugin error');
    });

    it('should handle makeHook function with complex argument validation', () => {
      const validatingPlugin: HookPlugin = {
        name: 'validating-plugin',
        description: 'Plugin with argument validation',
        version: '1.0.0',
        customArgs: {
          requiredArg: {
            description: 'A required argument',
            type: 'string',
            required: true,
          },
        },
        makeHook: (args) => {
          if (!args.requiredArg) {
            throw new Error('requiredArg is mandatory');
          }
          
          if (typeof args.requiredArg !== 'string') {
            throw new Error('requiredArg must be a string');
          }

          return {
            PreToolUse: [
              {
                hooks: [
                  {
                    type: 'command',
                    command: `echo "${args.requiredArg}"`,
                  },
                ],
              },
            ],
          };
        },
      };

      expect(() => validatingPlugin.makeHook({})).toThrow('requiredArg is mandatory');
      expect(() => validatingPlugin.makeHook({ requiredArg: 123 })).toThrow('requiredArg must be a string');
      expect(() => validatingPlugin.makeHook({ requiredArg: 'valid' })).not.toThrow();
    });

    it('should handle makeHook with extremely complex return structures', () => {
      const complexPlugin: HookPlugin = {
        name: 'ultra-complex-plugin',
        description: 'Plugin with extremely complex configurations',
        version: '1.0.0',
        makeHook: () => ({
          PreToolUse: Array.from({ length: 10 }, (_, i) => ({
            matcher: `Tool${i}`,
            hooks: Array.from({ length: 5 }, (_, j) => ({
              type: 'command' as const,
              command: `command-${i}-${j}`,
              timeout: (i + 1) * (j + 1) * 1000,
            })),
          })),
          PostToolUse: [
            {
              matcher: 'Write|Edit|MultiEdit|Read|Bash|Grep|Glob|Task',
              hooks: [
                {
                  type: 'command',
                  command: 'echo "Complex post-processing with special chars: !@#$%^&*()"',
                  timeout: 0,
                },
              ],
            },
          ],
        }),
      };

      const result = complexPlugin.makeHook({});
      expect(result.PreToolUse).toHaveLength(10);
      expect(result.PreToolUse![0].hooks).toHaveLength(5);
      expect(result.PreToolUse![9].hooks[4].timeout).toBe(50000); // 10 * 5 * 1000
    });
  });
});