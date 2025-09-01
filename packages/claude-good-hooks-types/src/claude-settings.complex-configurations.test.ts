import { describe, it, expect } from 'vitest';
import type { ClaudeSettings } from './index.js';

/**
 * Claude Settings Complex Hook Configurations Tests
 */

describe('ClaudeSettings - Complex Hook Configurations', () => {
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