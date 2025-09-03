import { describe, it, expect, expectTypeOf } from 'vitest';
import type { ClaudeSettings, HookConfiguration } from '../index.js';

/**
 * Claude Settings Hook Event Types Tests
 */

describe('ClaudeSettings - Hook Event Types', () => {
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
                command:
                  'osascript -e "display notification \\"Claude Code notification\\" with title \\"Claude Code\\""',
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
