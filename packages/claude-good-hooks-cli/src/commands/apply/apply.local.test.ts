import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplyCommand } from './apply.js';
import * as modules from '../../utils/modules.js';
import * as settings from '../../utils/settings.js';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../../utils/modules.js');
vi.mock('../../utils/settings.js');

const mockLoadHookPlugin = vi.mocked(modules.loadHookPlugin);
const mockAddHookToSettings = vi.mocked(settings.addHookToSettings);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('ApplyCommand - Local Scope', () => {
  const localHookPlugin: HookPlugin = {
    name: 'project-formatter',
    description: 'Local project-specific code formatter',
    version: '1.5.2',
    customArgs: {
      configFile: {
        description: 'Path to formatter config file',
        type: 'string',
        default: './.prettierrc',
      },
      checkOnly: {
        description: 'Only check formatting without fixing',
        type: 'boolean',
        default: false,
      },
      extensions: {
        description: 'File extensions to format',
        type: 'string',
        default: 'js,ts,json,md',
      },
      maxLineLength: {
        description: 'Maximum line length',
        type: 'number',
        default: 100,
      },
    },
    makeHook: (args) => ({
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: `format-code --config="${args.configFile}" --extensions="${args.extensions}" --max-line-length=${args.maxLineLength} ${
                args.checkOnly ? '--check' : '--fix'
              }`.trim(),
              timeout: 45,
            },
          ],
        },
      ],
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('local installation and loading', () => {
    it('should load hook plugin from local scope', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);

      const command = new ApplyCommand();
      await command.execute(['project-formatter', '--maxLineLength', '120'], { local: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('project-formatter', false);
    });

    it('should handle local hook loading failure', async () => {
      mockLoadHookPlugin.mockResolvedValue(null);

      const command = new ApplyCommand();
      await command.execute(['missing-local-hook'], { local: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('missing-local-hook', false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hook \'missing-local-hook\' not found')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle local hook loading failure in JSON format', async () => {
      mockLoadHookPlugin.mockResolvedValue(null);

      const command = new ApplyCommand();
      await command.execute(['missing-local-hook'], { local: true, parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: 'Hook \'missing-local-hook\' not found. Make sure it\'s installed.',
        })
      );
    });
  });

  describe('local hook configuration', () => {
    it('should apply hook to local settings with default arguments', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);

      const command = new ApplyCommand();
      await command.execute(['project-formatter'], { local: true, parent: {} });

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'local',
        'PostToolUse',
        expect.objectContaining({
          matcher: 'Write|Edit',
          hooks: expect.arrayContaining([
            expect.objectContaining({
              type: 'command',
              command: 'format-code --config="./.prettierrc" --extensions="js,ts,json,md" --max-line-length=100 --fix',
              timeout: 45,
            }),
          ]),
        })
      );
    });

    it('should apply local hook with custom arguments', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);

      await applyCommand(
        'project-formatter',
        [
          '--configFile',
          './custom.config.json',
          '--checkOnly',
          '--extensions',
          'ts,tsx,js,jsx',
          '--maxLineLength',
          '80',
        ],
        { local: true, parent: {} }
      );

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'local',
        'PostToolUse',
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({
              command: 'format-code --config="./custom.config.json" --extensions="ts,tsx,js,jsx" --max-line-length=80 --check',
            }),
          ]),
        })
      );
    });

    it('should show correct scope in success message', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);

      const command = new ApplyCommand();
      await command.execute(['project-formatter'], { local: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Applied hook \'project-formatter\' to local settings')
      );
    });

    it('should include local scope in JSON response', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);

      const command = new ApplyCommand();
      await command.execute(['project-formatter', '--checkOnly'], { local: true, parent: { json: true } });

      const expectedOutput = {
        success: true,
        hook: 'project-formatter',
        scope: 'local',
        args: {
          configFile: './.prettierrc',
          checkOnly: true,
          extensions: 'js,ts,json,md',
          maxLineLength: 100,
        },
      };

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const actualOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(actualOutput).toEqual(expectedOutput);
    });
  });

  describe('local-specific scenarios', () => {
    it('should handle project-specific hooks with relative paths', async () => {
      const projectSpecificPlugin: HookPlugin = {
        name: 'project-scripts',
        description: 'Execute project-specific scripts',
        version: '1.0.0',
        customArgs: {
          scriptPath: {
            description: 'Path to script relative to project root',
            type: 'string',
            required: true,
          },
          beforeHook: {
            description: 'Run before tool use',
            type: 'boolean',
            default: false,
          },
        },
        makeHook: (args) => {
          const eventType = args.beforeHook ? 'PreToolUse' : 'PostToolUse';
          return {
            [eventType]: [
              {
                matcher: '*',
                hooks: [
                  {
                    type: 'command',
                    command: `./scripts/${args.scriptPath}`,
                    timeout: 30,
                  },
                ],
              },
            ],
          };
        },
      };

      mockLoadHookPlugin.mockResolvedValue(projectSpecificPlugin);

      await applyCommand(
        'project-scripts',
        ['--scriptPath', 'validate.sh', '--beforeHook'],
        { local: true, parent: {} }
      );

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'local',
        'PreToolUse',
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({
              command: './scripts/validate.sh',
            }),
          ]),
        })
      );
    });

    it('should handle local hooks with environment-specific configuration', async () => {
      const envSpecificPlugin: HookPlugin = {
        name: 'env-detector',
        description: 'Environment-specific hook behavior',
        version: '2.0.0',
        customArgs: {
          environment: {
            description: 'Target environment',
            type: 'string',
            default: 'development',
          },
          enableDebug: {
            description: 'Enable debug mode',
            type: 'boolean',
            default: false,
          },
        },
        makeHook: (args) => ({
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'command',
                  command: `env-setup --env=${args.environment} ${args.enableDebug ? '--debug' : ''}`.trim(),
                  timeout: 10,
                },
              ],
            },
          ],
        }),
      };

      mockLoadHookPlugin.mockResolvedValue(envSpecificPlugin);

      await applyCommand(
        'env-detector',
        ['--environment', 'staging', '--enableDebug'],
        { local: true, parent: { json: true } }
      );

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'local',
        'UserPromptSubmit',
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({
              command: 'env-setup --env=staging --debug',
            }),
          ]),
        })
      );
    });

    it('should handle local hooks that generate multiple configurations', async () => {
      const multiConfigPlugin: HookPlugin = {
        name: 'multi-check',
        description: 'Multiple checks for local development',
        version: '1.2.0',
        customArgs: {
          enableLinting: {
            description: 'Enable linting checks',
            type: 'boolean',
            default: true,
          },
          enableTesting: {
            description: 'Enable test runs',
            type: 'boolean',
            default: true,
          },
          enableTypeCheck: {
            description: 'Enable type checking',
            type: 'boolean',
            default: false,
          },
        },
        makeHook: (args) => {
          const configs: any = {};

          if (args.enableLinting) {
            configs.PreToolUse = [
              {
                matcher: 'Write|Edit',
                hooks: [{ type: 'command', command: 'npm run lint', timeout: 30 }],
              },
            ];
          }

          if (args.enableTesting) {
            configs.PostToolUse = [
              {
                matcher: 'Write|Edit',
                hooks: [{ type: 'command', command: 'npm test', timeout: 60 }],
              },
            ];
          }

          if (args.enableTypeCheck) {
            configs.PreToolUse = [
              ...(configs.PreToolUse || []),
              {
                matcher: '*.ts|*.tsx',
                hooks: [{ type: 'command', command: 'tsc --noEmit', timeout: 45 }],
              },
            ];
          }

          return configs;
        },
      };

      mockLoadHookPlugin.mockResolvedValue(multiConfigPlugin);

      await applyCommand(
        'multi-check',
        ['--enableTypeCheck'],
        { local: true, parent: {} }
      );

      // Should add linting (default enabled)
      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'local',
        'PreToolUse',
        expect.objectContaining({
          matcher: 'Write|Edit',
          hooks: expect.arrayContaining([
            expect.objectContaining({
              command: 'npm run lint',
            }),
          ]),
        })
      );

      // Should add testing (default enabled)
      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'local',
        'PostToolUse',
        expect.objectContaining({
          matcher: 'Write|Edit',
          hooks: expect.arrayContaining([
            expect.objectContaining({
              command: 'npm test',
            }),
          ]),
        })
      );

      // Should add type checking (explicitly enabled)
      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'local',
        'PreToolUse',
        expect.objectContaining({
          matcher: '*.ts|*.tsx',
          hooks: expect.arrayContaining([
            expect.objectContaining({
              command: 'tsc --noEmit',
            }),
          ]),
        })
      );
    });
  });

  describe('local hook help display', () => {
    it('should show project installation suggestion in help', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);

      const command = new ApplyCommand();
      await command.execute(['project-formatter'], { help: true, local: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('project-formatter v1.5.2'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Local project-specific'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('claude-good-hooks apply --project project-formatter')
      );
    });

    it('should show local hook help in JSON format', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);

      const command = new ApplyCommand();
      await command.execute(['project-formatter'], { help: true, local: true, parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          name: 'project-formatter',
          description: 'Local project-specific code formatter',
          version: '1.5.2',
          customArgs: localHookPlugin.customArgs,
          usage: 'claude-good-hooks apply project-formatter [options]',
        })
      );
    });
  });

  describe('local vs global precedence', () => {
    it('should prefer local scope when both local and global flags are absent', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);

      const command = new ApplyCommand();
      await command.execute(['project-formatter'], { parent: {} });

      // Should default to project scope (not local)
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('project-formatter', false);
      expect(mockAddHookToSettings).toHaveBeenCalledWith('project', expect.anything(), expect.anything());
    });

    it('should use local scope when explicitly set', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);

      const command = new ApplyCommand();
      await command.execute(['project-formatter'], { local: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('project-formatter', false);
      expect(mockAddHookToSettings).toHaveBeenCalledWith('local', expect.anything(), expect.anything());
    });
  });

  describe('error scenarios in local context', () => {
    it('should handle settings write errors gracefully', async () => {
      mockLoadHookPlugin.mockResolvedValue(localHookPlugin);
      mockAddHookToSettings.mockImplementation(() => {
        throw new Error('Permission denied writing to .claude/settings.local.json');
      });

      await expect(
        applyCommand('project-formatter', [], { local: true, parent: {} })
      ).rejects.toThrow('Permission denied');
    });

    it('should handle malformed hook configurations', async () => {
      const malformedPlugin: HookPlugin = {
        name: 'broken-hook',
        description: 'A hook that returns invalid configuration',
        version: '1.0.0',
        makeHook: () => {
          // Return something that doesn't match expected structure
          return {} as any;
        },
      };

      mockLoadHookPlugin.mockResolvedValue(malformedPlugin);

      const command = new ApplyCommand();
      await command.execute(['broken-hook'], { local: true, parent: {} });

      // Should complete without adding any hooks since the configuration is empty
      expect(mockAddHookToSettings).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Applied hook \'broken-hook\' to local settings')
      );
    });
  });
});