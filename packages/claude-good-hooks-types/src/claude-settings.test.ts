import { describe, it, expect, expectTypeOf } from 'vitest';
import type { ClaudeSettings, HookConfiguration } from './index.js';

/**
 * Claude Settings Tests - Testing ClaudeSettings interface comprehensively
 */

describe('ClaudeSettings Interface', () => {
  describe('Basic Structure', () => {
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

  describe('Hook Event Types', () => {
    it('should support PreToolUse configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'validate-bash-command.sh',
                  timeout: 10000,
                },
              ],
            },
            {
              matcher: 'Write|Edit',
              hooks: [
                {
                  type: 'command',
                  command: 'check-file-permissions.sh',
                },
                {
                  type: 'command',
                  command: 'backup-file.sh',
                  timeout: 5000,
                },
              ],
            },
          ],
        },
      };

      expectTypeOf(settings.hooks!.PreToolUse).toEqualTypeOf<HookConfiguration[] | undefined>();
      expect(settings.hooks!.PreToolUse).toHaveLength(2);
      expect(settings.hooks!.PreToolUse![0].matcher).toBe('Bash');
      expect(settings.hooks!.PreToolUse![1].hooks).toHaveLength(2);
    });

    it('should support PostToolUse configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
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
            {
              matcher: 'Edit',
              hooks: [
                {
                  type: 'command',
                  command: 'git add -A && git status',
                  timeout: 15000,
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.PostToolUse).toHaveLength(2);
      expect(settings.hooks!.PostToolUse![0].hooks[0].command).toContain('prettier');
      expect(settings.hooks!.PostToolUse![1].hooks[0].command).toContain('git');
    });

    it('should support UserPromptSubmit configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'echo "$(date): User submitted prompt" >> ~/.claude/prompt-log.txt',
                },
                {
                  type: 'command',
                  command: 'validate-prompt-content.py',
                  timeout: 5000,
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.UserPromptSubmit).toHaveLength(1);
      expect(settings.hooks!.UserPromptSubmit![0].matcher).toBeUndefined();
      expect(settings.hooks!.UserPromptSubmit![0].hooks).toHaveLength(2);
    });

    it('should support Notification configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          Notification: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'osascript -e "display notification \\"Claude Code notification\\" with title \\"Claude Code\\""',
                },
                {
                  type: 'command',
                  command: 'echo "$(date): Notification sent" >> ~/.claude/notifications.log',
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.Notification![0].hooks[0].command).toContain('osascript');
      expect(settings.hooks!.Notification![0].hooks[1].command).toContain('notifications.log');
    });

    it('should support Stop configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'cleanup-temp-files.sh',
                  timeout: 30000,
                },
                {
                  type: 'command',
                  command: 'generate-session-report.py',
                  timeout: 60000,
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.Stop![0].hooks).toHaveLength(2);
      expect(settings.hooks!.Stop![0].hooks[0].timeout).toBe(30000);
      expect(settings.hooks!.Stop![0].hooks[1].timeout).toBe(60000);
    });

    it('should support SubagentStop configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          SubagentStop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'echo "Subagent task completed" >> ~/.claude/subagent.log',
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.SubagentStop![0].hooks[0].command).toContain('Subagent task completed');
    });

    it('should support SessionEnd configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          SessionEnd: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'archive-session-data.sh',
                  timeout: 120000,
                },
                {
                  type: 'command',
                  command: 'send-session-summary-email.py',
                  timeout: 30000,
                },
                {
                  type: 'command',
                  command: 'cleanup-session-temp-files.sh',
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.SessionEnd![0].hooks).toHaveLength(3);
      expect(settings.hooks!.SessionEnd![0].hooks[0].timeout).toBe(120000);
      expect(settings.hooks!.SessionEnd![0].hooks[2].timeout).toBeUndefined();
    });

    it('should support SessionStart configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'load-development-context.sh',
                  timeout: 45000,
                },
                {
                  type: 'command',
                  command: 'check-git-status-and-recent-changes.py',
                  timeout: 15000,
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.SessionStart![0].hooks[0].command).toContain('load-development-context');
      expect(settings.hooks!.SessionStart![0].hooks[1].command).toContain('check-git-status');
    });

    it('should support PreCompact configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PreCompact: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'backup-conversation.sh',
                  timeout: 30000,
                },
                {
                  type: 'command',
                  command: 'log-compact-operation.py',
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.PreCompact![0].hooks[0].command).toContain('backup-conversation');
      expect(settings.hooks!.PreCompact![0].hooks[1].command).toContain('log-compact-operation');
    });
  });

  describe('Complex Hook Configurations', () => {
    it('should support multiple configurations per hook type', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              hooks: [
                {
                  type: 'command',
                  command: 'format-file.sh',
                },
              ],
            },
            {
              matcher: 'Edit',
              hooks: [
                {
                  type: 'command',
                  command: 'validate-changes.sh',
                },
              ],
            },
            {
              matcher: 'MultiEdit',
              hooks: [
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

      expect(settings.hooks!.PostToolUse).toHaveLength(3);
      expect(settings.hooks!.PostToolUse![0].matcher).toBe('Write');
      expect(settings.hooks!.PostToolUse![1].matcher).toBe('Edit');
      expect(settings.hooks!.PostToolUse![2].matcher).toBe('MultiEdit');
    });

    it('should support mixed matcher and non-matcher configurations', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'validate-bash.sh',
                },
              ],
            },
          ],
          UserPromptSubmit: [
            {
              // No matcher for UserPromptSubmit
              hooks: [
                {
                  type: 'command',
                  command: 'log-prompt.sh',
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.PreToolUse![0].matcher).toBe('Bash');
      expect(settings.hooks!.UserPromptSubmit![0].matcher).toBeUndefined();
    });

    it('should support complex regex matchers', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: '^(Write|Edit|MultiEdit)$',
              hooks: [
                {
                  type: 'command',
                  command: 'exact-match-handler.sh',
                },
              ],
            },
            {
              matcher: 'Notebook.*',
              hooks: [
                {
                  type: 'command',
                  command: 'notebook-handler.sh',
                },
              ],
            },
            {
              matcher: 'mcp__.*__write.*',
              hooks: [
                {
                  type: 'command',
                  command: 'mcp-write-handler.sh',
                },
              ],
            },
            {
              matcher: '(?!Read).*',
              hooks: [
                {
                  type: 'command',
                  command: 'non-read-handler.sh',
                },
              ],
            },
          ],
        },
      };

      const matchers = settings.hooks!.PostToolUse!.map((config) => config.matcher);
      expect(matchers).toEqual([
        '^(Write|Edit|MultiEdit)$',
        'Notebook.*',
        'mcp__.*__write.*',
        '(?!Read).*',
      ]);
    });

    it('should support wildcard and empty matchers', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: 'universal-pre-handler.sh',
                },
              ],
            },
            {
              matcher: '',
              hooks: [
                {
                  type: 'command',
                  command: 'empty-matcher-handler.sh',
                },
              ],
            },
            {
              // No matcher property
              hooks: [
                {
                  type: 'command',
                  command: 'no-matcher-handler.sh',
                },
              ],
            },
          ],
        },
      };

      expect(settings.hooks!.PreToolUse![0].matcher).toBe('*');
      expect(settings.hooks!.PreToolUse![1].matcher).toBe('');
      expect(settings.hooks!.PreToolUse![2].matcher).toBeUndefined();
    });
  });

  describe('Real-world Configuration Examples', () => {
    it('should support a complete development workflow', () => {
      const devWorkflowSettings: ClaudeSettings = {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'git fetch origin',
                  timeout: 30000,
                },
                {
                  type: 'command',
                  command: 'git status --porcelain > ~/.claude/session-start-status.txt',
                },
                {
                  type: 'command',
                  command: 'load-project-context.sh',
                  timeout: 15000,
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
                  command: 'validate-dangerous-commands.py',
                  timeout: 5000,
                },
              ],
            },
            {
              matcher: 'Write|Edit|MultiEdit',
              hooks: [
                {
                  type: 'command',
                  command: 'backup-files.sh',
                  timeout: 10000,
                },
              ],
            },
          ],
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
                  command: 'eslint --fix $CLAUDE_PROJECT_DIR --ext .ts,.js,.tsx,.jsx',
                  timeout: 60000,
                },
                {
                  type: 'command',
                  command: 'npm run test:unit',
                  timeout: 120000,
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'generate-session-summary.py',
                  timeout: 30000,
                },
                {
                  type: 'command',
                  command: 'check-uncommitted-changes.sh',
                },
              ],
            },
          ],
          SessionEnd: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'archive-session-logs.sh',
                  timeout: 60000,
                },
                {
                  type: 'command',
                  command: 'cleanup-temp-files.sh',
                },
              ],
            },
          ],
        },
      };

      // Verify the complete workflow structure
      expect(Object.keys(devWorkflowSettings.hooks!)).toHaveLength(5);
      expect(devWorkflowSettings.hooks!.SessionStart![0].hooks).toHaveLength(3);
      expect(devWorkflowSettings.hooks!.PreToolUse).toHaveLength(2);
      expect(devWorkflowSettings.hooks!.PostToolUse![0].hooks).toHaveLength(3);
      expect(devWorkflowSettings.hooks!.Stop![0].hooks).toHaveLength(2);
      expect(devWorkflowSettings.hooks!.SessionEnd![0].hooks).toHaveLength(2);
    });

    it('should support a security-focused configuration', () => {
      const securitySettings: ClaudeSettings = {
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'scan-prompt-for-secrets.py',
                  timeout: 10000,
                },
                {
                  type: 'command',
                  command: 'log-user-activity.sh',
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
                  command: 'validate-command-safety.sh',
                  timeout: 5000,
                },
                {
                  type: 'command',
                  command: 'check-command-whitelist.py',
                  timeout: 3000,
                },
              ],
            },
            {
              matcher: 'Write',
              hooks: [
                {
                  type: 'command',
                  command: 'check-file-permissions.sh',
                },
                {
                  type: 'command',
                  command: 'scan-for-sensitive-content.py',
                  timeout: 15000,
                },
              ],
            },
          ],
          PostToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: 'audit-tool-usage.sh',
                },
              ],
            },
          ],
        },
      };

      expect(securitySettings.hooks!.UserPromptSubmit![0].hooks[0].command).toContain('scan-prompt-for-secrets');
      expect(securitySettings.hooks!.PreToolUse![0].hooks[0].command).toContain('validate-command-safety');
      expect(securitySettings.hooks!.PreToolUse![1].hooks[1].command).toContain('scan-for-sensitive-content');
      expect(securitySettings.hooks!.PostToolUse![0].matcher).toBe('*');
    });

    it('should support a CI/CD integration configuration', () => {
      const cicdSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write|Edit|MultiEdit',
              hooks: [
                {
                  type: 'command',
                  command: 'trigger-build-pipeline.sh',
                  timeout: 300000,
                },
                {
                  type: 'command',
                  command: 'update-deployment-status.py',
                  timeout: 30000,
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'create-pull-request.sh',
                  timeout: 60000,
                },
                {
                  type: 'command',
                  command: 'notify-team-slack.py',
                  timeout: 15000,
                },
              ],
            },
          ],
        },
      };

      expect(cicdSettings.hooks!.PostToolUse![0].hooks[0].timeout).toBe(300000);
      expect(cicdSettings.hooks!.Stop![0].hooks[0].command).toContain('create-pull-request');
    });

    it('should support MCP tool integration', () => {
      const mcpSettings: ClaudeSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'mcp__.*',
              hooks: [
                {
                  type: 'command',
                  command: 'log-mcp-tool-usage.sh',
                },
              ],
            },
            {
              matcher: 'mcp__filesystem__.*',
              hooks: [
                {
                  type: 'command',
                  command: 'validate-filesystem-operation.py',
                  timeout: 10000,
                },
              ],
            },
            {
              matcher: 'mcp__.*__write.*',
              hooks: [
                {
                  type: 'command',
                  command: 'backup-before-mcp-write.sh',
                  timeout: 30000,
                },
              ],
            },
          ],
          PostToolUse: [
            {
              matcher: 'mcp__memory__.*',
              hooks: [
                {
                  type: 'command',
                  command: 'sync-memory-operations.py',
                  timeout: 20000,
                },
              ],
            },
            {
              matcher: 'mcp__github__.*',
              hooks: [
                {
                  type: 'command',
                  command: 'update-github-integration-status.sh',
                },
              ],
            },
          ],
        },
      };

      expect(mcpSettings.hooks!.PreToolUse).toHaveLength(3);
      expect(mcpSettings.hooks!.PostToolUse).toHaveLength(2);
      expect(mcpSettings.hooks!.PreToolUse![0].matcher).toBe('mcp__.*');
      expect(mcpSettings.hooks!.PreToolUse![2].matcher).toBe('mcp__.*__write.*');
    });
  });

  describe('Type Safety and Validation', () => {
    it('should enforce correct type for all hook arrays', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PreToolUse: [{ hooks: [{ type: 'command', command: 'test' }] }],
          PostToolUse: [{ hooks: [{ type: 'command', command: 'test' }] }],
          UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'test' }] }],
          Notification: [{ hooks: [{ type: 'command', command: 'test' }] }],
          Stop: [{ hooks: [{ type: 'command', command: 'test' }] }],
          SubagentStop: [{ hooks: [{ type: 'command', command: 'test' }] }],
          SessionEnd: [{ hooks: [{ type: 'command', command: 'test' }] }],
          SessionStart: [{ hooks: [{ type: 'command', command: 'test' }] }],
          PreCompact: [{ hooks: [{ type: 'command', command: 'test' }] }],
        },
      };

      const hooks = settings.hooks!;
      
      expectTypeOf(hooks.PreToolUse).toEqualTypeOf<HookConfiguration[] | undefined>();
      expectTypeOf(hooks.PostToolUse).toEqualTypeOf<HookConfiguration[] | undefined>();
      expectTypeOf(hooks.UserPromptSubmit).toEqualTypeOf<HookConfiguration[] | undefined>();
      expectTypeOf(hooks.Notification).toEqualTypeOf<HookConfiguration[] | undefined>();
      expectTypeOf(hooks.Stop).toEqualTypeOf<HookConfiguration[] | undefined>();
      expectTypeOf(hooks.SubagentStop).toEqualTypeOf<HookConfiguration[] | undefined>();
      expectTypeOf(hooks.SessionEnd).toEqualTypeOf<HookConfiguration[] | undefined>();
      expectTypeOf(hooks.SessionStart).toEqualTypeOf<HookConfiguration[] | undefined>();
      expectTypeOf(hooks.PreCompact).toEqualTypeOf<HookConfiguration[] | undefined>();
    });

    it('should allow partial hook definitions', () => {
      const partialSettings: ClaudeSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Write',
              hooks: [{ type: 'command', command: 'pre-write' }],
            },
          ],
          PostToolUse: [
            {
              hooks: [{ type: 'command', command: 'post-any' }],
            },
          ],
          // Other hook types omitted
        },
      };

      expect(partialSettings.hooks!.PreToolUse).toBeDefined();
      expect(partialSettings.hooks!.PostToolUse).toBeDefined();
      expect(partialSettings.hooks!.UserPromptSubmit).toBeUndefined();
      expect(partialSettings.hooks!.SessionStart).toBeUndefined();
    });

    it('should handle deeply nested structures correctly', () => {
      const deepSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'complex-matcher',
              hooks: [
                {
                  type: 'command',
                  command: 'complex-command-with-args.sh --arg1 value1 --arg2 "value with spaces" --flag',
                  timeout: 45000,
                },
              ],
            },
          ],
        },
      };

      const command = deepSettings.hooks!.PostToolUse![0].hooks[0];
      expectTypeOf(command.type).toEqualTypeOf<'command'>();
      expectTypeOf(command.command).toEqualTypeOf<string>();
      expectTypeOf(command.timeout).toEqualTypeOf<number | undefined>();
      
      expect(command.command.length).toBeGreaterThan(50);
      expect(command.timeout).toBe(45000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle settings with only some hook types', () => {
      const minimalSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              hooks: [{ type: 'command', command: 'minimal-post' }],
            },
          ],
        },
      };

      expect(Object.keys(minimalSettings.hooks!)).toEqual(['PostToolUse']);
      expect(minimalSettings.hooks!.PreToolUse).toBeUndefined();
    });

    it('should handle empty hook arrays', () => {
      const emptyHooksSettings: ClaudeSettings = {
        hooks: {
          PreToolUse: [],
          PostToolUse: [],
        },
      };

      expect(emptyHooksSettings.hooks!.PreToolUse).toHaveLength(0);
      expect(emptyHooksSettings.hooks!.PostToolUse).toHaveLength(0);
    });

    it('should handle hooks with no commands', () => {
      const noCommandsSettings: ClaudeSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              hooks: [], // Empty hooks array
            },
          ],
        },
      };

      expect(noCommandsSettings.hooks!.PostToolUse![0].hooks).toHaveLength(0);
    });

    it('should handle very complex configurations', () => {
      const complexSettings: ClaudeSettings = {
        hooks: {
          PreToolUse: Array.from({ length: 10 }, (_, i) => ({
            matcher: `Tool${i}`,
            hooks: Array.from({ length: 3 }, (_, j) => ({
              type: 'command' as const,
              command: `command-${i}-${j}`,
              timeout: Math.random() > 0.5 ? (i + 1) * (j + 1) * 1000 : undefined,
            })),
          })),
          PostToolUse: [
            {
              matcher: 'Write|Edit|MultiEdit|Read|Bash|Grep|Glob|Task|WebFetch|WebSearch',
              hooks: [
                {
                  type: 'command',
                  command: 'universal-post-handler.sh',
                  timeout: 30000,
                },
              ],
            },
          ],
        },
      };

      expect(complexSettings.hooks!.PreToolUse).toHaveLength(10);
      expect(complexSettings.hooks!.PreToolUse![0].hooks).toHaveLength(3);
      expect(complexSettings.hooks!.PostToolUse![0].matcher).toContain('Write|Edit');
    });
  });
});