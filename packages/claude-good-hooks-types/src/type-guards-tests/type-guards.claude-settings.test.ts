import { describe, it, expect } from 'vitest';
import { isClaudeSettings, type ClaudeSettings } from '../index.js';

/**
 * Type Guards Tests - isClaudeSettings
 */

describe('Type Guards - isClaudeSettings', () => {
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

    validSettings.forEach(settings => {
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
          PreToolUse: ['not a hook configuration'],
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

    invalidSettings.forEach(settings => {
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

    validHookTypes.forEach(hookType => {
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
            hooks: [{ type: 'command', command: 'global-pre-command' }],
          },
        ],
        PostToolUse: [
          {
            matcher: 'mcp__.*__write.*',
            hooks: [{ type: 'command', command: 'mcp-write-handler', timeout: 60000 }],
          },
        ],
      },
    };

    expect(isClaudeSettings(complexSettings)).toBe(true);
  });
});
