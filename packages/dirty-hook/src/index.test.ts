import { describe, it, expect } from 'vitest';
import dirtyHook from './index.js';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

describe('dirty-hook plugin', () => {
  describe('plugin metadata', () => {
    it('should have correct plugin structure', () => {
      expect(dirtyHook).toMatchObject({
        name: 'dirty',
        description: 'Shows git dirty status before user prompts',
        version: '1.0.0',
        makeHook: expect.any(Function),
      });
    });

    it('should have correct custom arguments definition', () => {
      expect(dirtyHook.customArgs).toEqual({
        staged: {
          description: 'Show only staged changes',
          type: 'boolean',
          default: false,
        },
        unstaged: {
          description: 'Show only unstaged changes',
          type: 'boolean',
          default: false,
        },
        filenames: {
          description: 'Show only filenames without status codes',
          type: 'boolean',
          default: false,
        },
        diffs: {
          description: 'Include diff output',
          type: 'boolean',
          default: false,
        },
      });
    });

    it('should implement HookPlugin interface', () => {
      const plugin: HookPlugin = dirtyHook;
      expect(plugin.name).toBe('dirty');
      expect(plugin.makeHook).toBeDefined();
    });
  });

  describe('default configuration scenarios', () => {
    it('should return git status --short with no arguments', () => {
      const result = dirtyHook.makeHook({});
      
      expect(result).toEqual({
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: 'command',
                command: 'git status --short',
                timeout: 10000,
              },
            ],
          },
        ],
      });
    });

    it('should return git status --short with all false arguments', () => {
      const result = dirtyHook.makeHook({
        staged: false,
        unstaged: false,
        filenames: false,
        diffs: false,
      });
      
      expect(result).toEqual({
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: 'command',
                command: 'git status --short',
                timeout: 10000,
              },
            ],
          },
        ],
      });
    });

    it('should return git status --short when both staged and unstaged are true', () => {
      const result = dirtyHook.makeHook({
        staged: true,
        unstaged: true,
      });
      
      expect(result).toEqual({
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: 'command',
                command: 'git status --short',
                timeout: 10000,
              },
            ],
          },
        ],
      });
    });
  });

  describe('staged-only scenarios', () => {
    it('should show staged changes only', () => {
      const result = dirtyHook.makeHook({
        staged: true,
        unstaged: false,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff --cached --name-status');
    });

    it('should show staged changes with filenames only', () => {
      const result = dirtyHook.makeHook({
        staged: true,
        unstaged: false,
        filenames: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff --cached --name-only');
    });

    it('should show staged changes with diffs', () => {
      const result = dirtyHook.makeHook({
        staged: true,
        unstaged: false,
        diffs: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff --cached');
    });

    it('should prioritize diffs over filenames for staged changes', () => {
      const result = dirtyHook.makeHook({
        staged: true,
        unstaged: false,
        filenames: true,
        diffs: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff --cached');
    });
  });

  describe('unstaged-only scenarios', () => {
    it('should show unstaged changes only', () => {
      const result = dirtyHook.makeHook({
        staged: false,
        unstaged: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff --name-status');
    });

    it('should show unstaged changes with filenames only', () => {
      const result = dirtyHook.makeHook({
        staged: false,
        unstaged: true,
        filenames: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff --name-only');
    });

    it('should show unstaged changes with diffs', () => {
      const result = dirtyHook.makeHook({
        staged: false,
        unstaged: true,
        diffs: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff');
    });

    it('should prioritize diffs over filenames for unstaged changes', () => {
      const result = dirtyHook.makeHook({
        staged: false,
        unstaged: true,
        filenames: true,
        diffs: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff');
    });
  });

  describe('filenames-only scenarios', () => {
    it('should show filenames only with default status', () => {
      const result = dirtyHook.makeHook({
        filenames: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git status --short | cut -c4-');
    });

    it('should show filenames only for both staged and unstaged', () => {
      const result = dirtyHook.makeHook({
        staged: true,
        unstaged: true,
        filenames: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git status --short | cut -c4-');
    });

    it('should handle filenames with explicit false unstaged', () => {
      const result = dirtyHook.makeHook({
        staged: false,
        unstaged: false,
        filenames: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git status --short | cut -c4-');
    });
  });

  describe('diff scenarios', () => {
    it('should show diffs with default behavior (all changes)', () => {
      const result = dirtyHook.makeHook({
        diffs: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff HEAD');
    });

    it('should show diffs for both staged and unstaged', () => {
      const result = dirtyHook.makeHook({
        staged: true,
        unstaged: true,
        diffs: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff HEAD');
    });

    it('should show diffs with explicit false flags', () => {
      const result = dirtyHook.makeHook({
        staged: false,
        unstaged: false,
        diffs: true,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff HEAD');
    });
  });

  describe('complex argument combinations', () => {
    it('should handle all arguments as strings (truthy values)', () => {
      const result = dirtyHook.makeHook({
        staged: 'true',
        unstaged: 'false',
        filenames: 'yes',
        diffs: '',
      });
      
      // staged='true' (truthy), unstaged='false' (truthy), filenames='yes' (truthy), diffs='' (falsy)
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git status --short | cut -c4-');
    });

    it('should handle numeric values', () => {
      const result = dirtyHook.makeHook({
        staged: 1,
        unstaged: 0,
        filenames: 0,
        diffs: 1,
      });
      
      // staged=1 (truthy), unstaged=0 (falsy), diffs=1 (truthy)
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff --cached');
    });

    it('should handle null and undefined values', () => {
      const result = dirtyHook.makeHook({
        staged: null,
        unstaged: undefined,
        filenames: null,
        diffs: undefined,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git status --short');
    });
  });

  describe('hook configuration structure', () => {
    it('should always return UserPromptSubmit configuration', () => {
      const result = dirtyHook.makeHook({});
      
      expect(result).toHaveProperty('UserPromptSubmit');
      expect(Array.isArray(result.UserPromptSubmit)).toBe(true);
      expect(result.UserPromptSubmit).toHaveLength(1);
    });

    it('should have proper hook command structure', () => {
      const result = dirtyHook.makeHook({});
      const hookConfig = result.UserPromptSubmit?.[0];
      
      expect(hookConfig).toEqual({
        hooks: [
          {
            type: 'command',
            command: expect.any(String),
            timeout: 10000,
          },
        ],
      });
    });

    it('should not include matcher in hook configuration', () => {
      const result = dirtyHook.makeHook({});
      const hookConfig = result.UserPromptSubmit?.[0];
      
      expect(hookConfig).not.toHaveProperty('matcher');
    });

    it('should have consistent timeout across all scenarios', () => {
      const scenarios = [
        {},
        { staged: true },
        { unstaged: true },
        { filenames: true },
        { diffs: true },
        { staged: true, diffs: true },
        { unstaged: true, filenames: true },
      ];

      scenarios.forEach((args) => {
        const result = dirtyHook.makeHook(args);
        expect(result.UserPromptSubmit?.[0]?.hooks[0]?.timeout).toBe(10000);
      });
    });

    it('should not return other hook event types', () => {
      const result = dirtyHook.makeHook({});
      
      expect(result).not.toHaveProperty('PreToolUse');
      expect(result).not.toHaveProperty('PostToolUse');
      expect(result).not.toHaveProperty('Notification');
      expect(result).not.toHaveProperty('Stop');
      expect(result).not.toHaveProperty('SubagentStop');
      expect(result).not.toHaveProperty('SessionEnd');
      expect(result).not.toHaveProperty('SessionStart');
      expect(result).not.toHaveProperty('PreCompact');
    });
  });

  describe('command generation edge cases', () => {
    it('should generate valid git commands for all scenarios', () => {
      const testCases = [
        { args: {}, expected: 'git status --short' },
        { args: { staged: true }, expected: 'git diff --cached --name-status' },
        { args: { unstaged: true }, expected: 'git diff --name-status' },
        { args: { filenames: true }, expected: 'git status --short | cut -c4-' },
        { args: { diffs: true }, expected: 'git diff HEAD' },
        { args: { staged: true, filenames: true }, expected: 'git diff --cached --name-only' },
        { args: { unstaged: true, filenames: true }, expected: 'git diff --name-only' },
        { args: { staged: true, diffs: true }, expected: 'git diff --cached' },
        { args: { unstaged: true, diffs: true }, expected: 'git diff' },
        { args: { staged: true, unstaged: true, filenames: true }, expected: 'git status --short | cut -c4-' },
        { args: { staged: true, unstaged: true, diffs: true }, expected: 'git diff HEAD' },
      ];

      testCases.forEach(({ args, expected }) => {
        const result = dirtyHook.makeHook(args);
        expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe(expected);
      });
    });

    it('should handle empty object gracefully', () => {
      const result = dirtyHook.makeHook({});
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git status --short');
    });

    it('should handle extra unknown arguments gracefully', () => {
      const result = dirtyHook.makeHook({
        staged: true,
        unknown: 'value',
        another: 123,
      });
      
      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe('git diff --cached --name-status');
    });
  });
});