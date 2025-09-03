import { describe, it, expect } from 'vitest';
import type { HookPlugin } from '../index.js';

/**
 * Hook Plugin Real-world Examples Tests
 */

describe('HookPlugin - Real-world Examples', () => {
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
      makeHook: args => {
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
      makeHook: args => {
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
      makeHook: args => {
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
      makeHook: args => {
        const hooks = [];

        if (args.notifyOnComplete !== false) {
          hooks.push({
            type: 'command' as const,
            command:
              'osascript -e "display notification \\"Task completed\\" with title \\"Claude Code\\""',
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
                  command:
                    'osascript -e "display notification \\"Session ended\\" with title \\"Claude Code\\""',
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
