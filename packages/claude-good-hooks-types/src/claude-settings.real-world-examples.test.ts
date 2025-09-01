import { describe, it, expect } from 'vitest';
import type { ClaudeSettings } from './index.js';

/**
 * Claude Settings Real-world Configuration Examples Tests
 */

describe('ClaudeSettings - Real-world Configuration Examples', () => {
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