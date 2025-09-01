import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookConfiguration, HookCommand } from './index.js';

/**
 * Hook Configuration Tests - Testing HookConfiguration interface thoroughly
 */

describe('HookConfiguration Interface', () => {
  describe('Core Structure', () => {
    it('should require hooks array as mandatory field', () => {
      const config: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: 'echo "test"',
          },
        ],
      };

      expectTypeOf(config.hooks).toEqualTypeOf<HookCommand[]>();
      expect(Array.isArray(config.hooks)).toBe(true);
    });

    it('should make matcher field optional', () => {
      const configWithoutMatcher: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: 'global-command',
          },
        ],
      };

      const configWithMatcher: HookConfiguration = {
        matcher: 'specific-tool',
        hooks: [
          {
            type: 'command',
            command: 'specific-command',
          },
        ],
      };

      expectTypeOf(configWithoutMatcher.matcher).toEqualTypeOf<string | undefined>();
      expectTypeOf(configWithMatcher.matcher).toEqualTypeOf<string | undefined>();
      
      expect(configWithoutMatcher.matcher).toBeUndefined();
      expect(configWithMatcher.matcher).toBe('specific-tool');
    });
  });

  describe('Matcher Patterns', () => {
    it('should support exact tool name matching', () => {
      const exactMatch: HookConfiguration = {
        matcher: 'Write',
        hooks: [{ type: 'command', command: 'format-file' }],
      };

      expect(exactMatch.matcher).toBe('Write');
    });

    it('should support pipe-separated alternatives', () => {
      const alternatives: HookConfiguration = {
        matcher: 'Write|Edit|MultiEdit',
        hooks: [{ type: 'command', command: 'validate-changes' }],
      };

      expect(alternatives.matcher).toBe('Write|Edit|MultiEdit');
    });

    it('should support wildcard patterns', () => {
      const patterns = [
        '*',
        'Notebook.*',
        '.*Edit.*',
        'mcp__.*',
        'mcp__.*__write.*',
        '(Read|Write).*',
      ];

      patterns.forEach((pattern) => {
        const config: HookConfiguration = {
          matcher: pattern,
          hooks: [{ type: 'command', command: 'pattern-handler' }],
        };

        expect(config.matcher).toBe(pattern);
        expectTypeOf(config.matcher).toEqualTypeOf<string | undefined>();
      });
    });

    it('should handle complex regex-style patterns', () => {
      const complexPatterns = [
        '^(Write|Edit)$',
        'Bash\\(git.*\\)',
        '(?!Read).*',
        'Tool[A-Z].*',
        'mcp__[a-z]+__.*',
      ];

      complexPatterns.forEach((pattern) => {
        const config: HookConfiguration = {
          matcher: pattern,
          hooks: [{ type: 'command', command: 'complex-handler' }],
        };

        expect(config.matcher).toBe(pattern);
      });
    });

    it('should support empty string matcher', () => {
      const emptyMatcher: HookConfiguration = {
        matcher: '',
        hooks: [{ type: 'command', command: 'empty-matcher-handler' }],
      };

      expect(emptyMatcher.matcher).toBe('');
    });
  });

  describe('Hooks Array Variations', () => {
    it('should support single hook command', () => {
      const singleHook: HookConfiguration = {
        matcher: 'SingleTool',
        hooks: [
          {
            type: 'command',
            command: 'single-handler',
          },
        ],
      };

      expect(singleHook.hooks).toHaveLength(1);
      expectTypeOf(singleHook.hooks).toEqualTypeOf<HookCommand[]>();
    });

    it('should support multiple hook commands', () => {
      const multipleHooks: HookConfiguration = {
        matcher: 'MultiTool',
        hooks: [
          {
            type: 'command',
            command: 'first-handler',
            timeout: 5000,
          },
          {
            type: 'command',
            command: 'second-handler',
          },
          {
            type: 'command',
            command: 'third-handler',
            timeout: 10000,
          },
        ],
      };

      expect(multipleHooks.hooks).toHaveLength(3);
      expect(multipleHooks.hooks[0].timeout).toBe(5000);
      expect(multipleHooks.hooks[1].timeout).toBeUndefined();
      expect(multipleHooks.hooks[2].timeout).toBe(10000);
    });

    it('should support empty hooks array', () => {
      const emptyHooks: HookConfiguration = {
        matcher: 'EmptyTool',
        hooks: [],
      };

      expect(emptyHooks.hooks).toHaveLength(0);
      expect(Array.isArray(emptyHooks.hooks)).toBe(true);
    });

    it('should maintain hook order', () => {
      const orderedHooks: HookConfiguration = {
        hooks: [
          { type: 'command', command: 'first' },
          { type: 'command', command: 'second' },
          { type: 'command', command: 'third' },
          { type: 'command', command: 'fourth' },
        ],
      };

      expect(orderedHooks.hooks[0].command).toBe('first');
      expect(orderedHooks.hooks[1].command).toBe('second');
      expect(orderedHooks.hooks[2].command).toBe('third');
      expect(orderedHooks.hooks[3].command).toBe('fourth');
    });
  });

  describe('Command Variations', () => {
    it('should support simple shell commands', () => {
      const simpleCommands: HookConfiguration = {
        hooks: [
          { type: 'command', command: 'ls -la' },
          { type: 'command', command: 'echo "hello world"' },
          { type: 'command', command: 'pwd' },
        ],
      };

      simpleCommands.hooks.forEach((hook) => {
        expectTypeOf(hook.command).toEqualTypeOf<string>();
        expect(typeof hook.command).toBe('string');
      });
    });

    it('should support complex shell commands', () => {
      const complexCommands: HookConfiguration = {
        matcher: 'ComplexTool',
        hooks: [
          {
            type: 'command',
            command: 'find . -name "*.ts" -not -path "./node_modules/*" | xargs eslint',
          },
          {
            type: 'command',
            command: 'docker run --rm -v $(pwd):/app node:18 npm test',
          },
          {
            type: 'command',
            command: 'if [ -f package.json ]; then npm run build; fi',
            timeout: 120000,
          },
        ],
      };

      expect(complexCommands.hooks).toHaveLength(3);
      complexCommands.hooks.forEach((hook) => {
        expect(hook.command.length).toBeGreaterThan(10);
      });
    });

    it('should support script file execution', () => {
      const scriptExecution: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: '$CLAUDE_PROJECT_DIR/.claude/hooks/validate.sh',
          },
          {
            type: 'command',
            command: '/usr/local/bin/custom-validator',
            timeout: 30000,
          },
          {
            type: 'command',
            command: 'python3 $CLAUDE_PROJECT_DIR/scripts/check.py',
          },
        ],
      };

      scriptExecution.hooks.forEach((hook) => {
        expect(hook.command).toMatch(/\.(sh|py)$|validator$/);
      });
    });

    it('should support commands with environment variables', () => {
      const envCommands: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: 'NODE_ENV=production npm run build',
          },
          {
            type: 'command',
            command: 'DEBUG=1 VERBOSE=true ./test-script.sh',
          },
          {
            type: 'command',
            command: 'export PATH=$PATH:/custom/bin && custom-tool',
          },
        ],
      };

      envCommands.hooks.forEach((hook) => {
        expect(hook.command).toMatch(/[A-Z_]+=|export/);
      });
    });
  });

  describe('Timeout Configurations', () => {
    it('should support various timeout values', () => {
      const timeoutVariations: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: 'quick-command',
            timeout: 1000, // 1 second
          },
          {
            type: 'command',
            command: 'medium-command',
            timeout: 30000, // 30 seconds
          },
          {
            type: 'command',
            command: 'long-command',
            timeout: 300000, // 5 minutes
          },
          {
            type: 'command',
            command: 'very-long-command',
            timeout: 1800000, // 30 minutes
          },
        ],
      };

      expect(timeoutVariations.hooks[0].timeout).toBe(1000);
      expect(timeoutVariations.hooks[1].timeout).toBe(30000);
      expect(timeoutVariations.hooks[2].timeout).toBe(300000);
      expect(timeoutVariations.hooks[3].timeout).toBe(1800000);
    });

    it('should support zero timeout', () => {
      const zeroTimeout: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: 'instant-command',
            timeout: 0,
          },
        ],
      };

      expect(zeroTimeout.hooks[0].timeout).toBe(0);
    });

    it('should support mixed timeout configurations', () => {
      const mixedTimeouts: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: 'no-timeout-command',
          },
          {
            type: 'command',
            command: 'with-timeout-command',
            timeout: 15000,
          },
          {
            type: 'command',
            command: 'another-no-timeout',
          },
        ],
      };

      expect(mixedTimeouts.hooks[0].timeout).toBeUndefined();
      expect(mixedTimeouts.hooks[1].timeout).toBe(15000);
      expect(mixedTimeouts.hooks[2].timeout).toBeUndefined();
    });
  });

  describe('Real-world Use Cases', () => {
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

  describe('Edge Cases and Validation', () => {
    it('should handle very long command strings', () => {
      const longCommand = 'echo "' + 'a'.repeat(5000) + '"';
      const config: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: longCommand,
          },
        ],
      };

      expect(config.hooks[0].command.length).toBe(longCommand.length);
    });

    it('should handle special characters in commands', () => {
      const specialCharsConfig: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: 'echo "Special chars: !@#$%^&*()_+-={}[]|\\:";\'<>?,./"',
          },
          {
            type: 'command',
            command: 'grep -r "pattern with spaces and quotes \\"nested\\"" .',
          },
        ],
      };

      expect(specialCharsConfig.hooks).toHaveLength(2);
    });

    it('should handle unicode characters', () => {
      const unicodeConfig: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: 'echo "Unicode: 你好 🌍 emoji test"',
          },
        ],
      };

      expect(unicodeConfig.hooks[0].command).toContain('你好');
      expect(unicodeConfig.hooks[0].command).toContain('🌍');
    });

    it('should handle extreme timeout values', () => {
      const extremeTimeouts: HookConfiguration = {
        hooks: [
          {
            type: 'command',
            command: 'instant',
            timeout: 0,
          },
          {
            type: 'command',
            command: 'max-safe-integer',
            timeout: Number.MAX_SAFE_INTEGER,
          },
          {
            type: 'command',
            command: 'very-large',
            timeout: 999999999,
          },
        ],
      };

      expect(extremeTimeouts.hooks[0].timeout).toBe(0);
      expect(extremeTimeouts.hooks[1].timeout).toBe(Number.MAX_SAFE_INTEGER);
      expect(extremeTimeouts.hooks[2].timeout).toBe(999999999);
    });
  });
});