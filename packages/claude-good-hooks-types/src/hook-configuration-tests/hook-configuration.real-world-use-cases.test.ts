import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookConfiguration } from '../index.js';

/**
 * Hook Configuration Real-world Use Cases Tests
 */

describe('HookConfiguration - Real-world Use Cases', () => {
  it('should support code formatting hook', () => {
    const formattingHook: HookConfiguration = {
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
    };

    expect(formattingHook.matcher).toBe('Write|Edit|MultiEdit');
    expect(formattingHook.hooks).toHaveLength(2);
  });

  it('should support testing hook', () => {
    const testingHook: HookConfiguration = {
      matcher: 'Write|Edit',
      hooks: [
        {
          type: 'command',
          command: 'npm run test:unit',
          timeout: 120000,
        },
        {
          type: 'command',
          command: 'npm run test:integration',
          timeout: 300000,
        },
      ],
    };

    expect(testingHook.hooks.every((hook) => hook.timeout && hook.timeout > 60000)).toBe(true);
  });

  it('should support git hooks integration', () => {
    const gitHook: HookConfiguration = {
      matcher: 'Write|Edit|MultiEdit',
      hooks: [
        {
          type: 'command',
          command: 'git add -A',
          timeout: 10000,
        },
        {
          type: 'command',
          command: 'git status --porcelain',
        },
        {
          type: 'command',
          command: 'if [ -n "$(git status --porcelain)" ]; then git commit -m "Auto-commit: Claude Code changes"; fi',
          timeout: 15000,
        },
      ],
    };

    expect(gitHook.hooks).toHaveLength(3);
    expect(gitHook.hooks.every((hook) => hook.command.includes('git'))).toBe(true);
  });

  it('should support notification hooks', () => {
    const notificationHook: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'osascript -e "display notification \\"Claude Code is waiting\\" with title \\"Claude Code\\""',
        },
        {
          type: 'command',
          command: 'echo "$(date): Claude Code notification" >> ~/.claude/notifications.log',
        },
      ],
    };

    expect(notificationHook.matcher).toBeUndefined();
    expect(notificationHook.hooks).toHaveLength(2);
  });

  it('should support MCP tool pattern matching', () => {
    const mcpHook: HookConfiguration = {
      matcher: 'mcp__.*__write.*',
      hooks: [
        {
          type: 'command',
          command: 'echo "MCP write operation detected" >> ~/.claude/mcp.log',
        },
      ],
    };

    expect(mcpHook.matcher).toBe('mcp__.*__write.*');
  });

  it('should support session lifecycle hooks', () => {
    const sessionHooks: HookConfiguration[] = [
      {
        // Session start
        hooks: [
          {
            type: 'command',
            command: 'echo "Session started at $(date)" >> ~/.claude/session.log',
          },
          {
            type: 'command',
            command: 'git status --porcelain > ~/.claude/session-start-status.txt',
          },
        ],
      },
      {
        // Session end
        hooks: [
          {
            type: 'command',
            command: 'echo "Session ended at $(date)" >> ~/.claude/session.log',
          },
          {
            type: 'command',
            command: 'git diff --stat >> ~/.claude/session-summary.txt',
          },
        ],
      },
    ];

    sessionHooks.forEach((config) => {
      expectTypeOf(config).toEqualTypeOf<HookConfiguration>();
      expect(config.hooks.length).toBeGreaterThan(0);
    });
  });
});