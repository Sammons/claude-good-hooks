import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import dirtyHook from './index.js';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

describe('dirty-hook plugin', () => {
  let tempDir: string;
  let mockContext: { settingsDirectoryPath: string };

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dirty-hook-test-'));
    mockContext = { settingsDirectoryPath: tempDir };
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

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

  describe('context validation', () => {
    it('should throw error if settingsDirectoryPath is not provided', () => {
      expect(() => dirtyHook.makeHook({}, {} as any)).toThrow(
        'settingsDirectoryPath is required but was not provided'
      );
    });

    it('should throw error if settingsDirectoryPath does not exist', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent');
      expect(() => dirtyHook.makeHook({}, { settingsDirectoryPath: nonExistentPath })).toThrow(
        `Settings directory does not exist: ${nonExistentPath}`
      );
    });
  });

  describe('script file creation', () => {
    it('should create scripts directory if it does not exist', () => {
      dirtyHook.makeHook({}, mockContext);

      const scriptsDir = path.join(tempDir, 'scripts');
      expect(fs.existsSync(scriptsDir)).toBe(true);
      expect(fs.lstatSync(scriptsDir).isDirectory()).toBe(true);
    });

    it('should create the script file with correct content', () => {
      dirtyHook.makeHook({}, mockContext);

      const scriptPath = path.join(tempDir, 'scripts', 'dirty-good-claude-hook.js');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toContain('#!/usr/bin/env node');
      expect(content).toContain('parseArgs');
      expect(content).toContain('getGitCommand');
      expect(content).toContain('execSync');
    });

    it('should make script file executable', () => {
      dirtyHook.makeHook({}, mockContext);

      const scriptPath = path.join(tempDir, 'scripts', 'dirty-good-claude-hook.js');
      const stats = fs.lstatSync(scriptPath);
      // Check if the file has execute permissions
      expect(stats.mode & parseInt('755', 8)).toBeTruthy();
    });

    it('should overwrite existing script file', () => {
      // Create the scripts directory and file first
      const scriptsDir = path.join(tempDir, 'scripts');
      fs.mkdirSync(scriptsDir);
      const scriptPath = path.join(scriptsDir, 'dirty-good-claude-hook.js');
      fs.writeFileSync(scriptPath, 'old content');

      // Now call makeHook
      dirtyHook.makeHook({}, mockContext);

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toContain('#!/usr/bin/env node');
      expect(content).not.toContain('old content');
    });
  });

  describe('command generation', () => {
    it('should return script command with no arguments by default', () => {
      const result = dirtyHook.makeHook({}, mockContext);

      expect(result).toEqual({
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: 'command',
                command: '$CLAUDE_PROJECT_DIR/.claude/scripts/dirty-good-claude-hook.js',
                timeout: 10000,
              },
            ],
          },
        ],
      });
    });

    it('should include --staged argument when staged is true', () => {
      const result = dirtyHook.makeHook({ staged: true }, mockContext);

      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe(
        '$CLAUDE_PROJECT_DIR/.claude/scripts/dirty-good-claude-hook.js --staged'
      );
    });

    it('should include --unstaged argument when unstaged is true', () => {
      const result = dirtyHook.makeHook({ unstaged: true }, mockContext);

      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe(
        '$CLAUDE_PROJECT_DIR/.claude/scripts/dirty-good-claude-hook.js --unstaged'
      );
    });

    it('should include --filenames argument when filenames is true', () => {
      const result = dirtyHook.makeHook({ filenames: true }, mockContext);

      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe(
        '$CLAUDE_PROJECT_DIR/.claude/scripts/dirty-good-claude-hook.js --filenames'
      );
    });

    it('should include --diffs argument when diffs is true', () => {
      const result = dirtyHook.makeHook({ diffs: true }, mockContext);

      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe(
        '$CLAUDE_PROJECT_DIR/.claude/scripts/dirty-good-claude-hook.js --diffs'
      );
    });

    it('should combine multiple arguments', () => {
      const result = dirtyHook.makeHook(
        {
          staged: true,
          filenames: true,
          diffs: true,
        },
        mockContext
      );

      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe(
        '$CLAUDE_PROJECT_DIR/.claude/scripts/dirty-good-claude-hook.js --staged --filenames --diffs'
      );
    });

    it('should handle falsy values correctly', () => {
      const result = dirtyHook.makeHook(
        {
          staged: false,
          unstaged: false,
          filenames: false,
          diffs: false,
        },
        mockContext
      );

      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe(
        '$CLAUDE_PROJECT_DIR/.claude/scripts/dirty-good-claude-hook.js'
      );
    });

    it('should handle truthy non-boolean values', () => {
      const result = dirtyHook.makeHook(
        {
          staged: 'yes',
          unstaged: 1,
          filenames: 'true',
          diffs: {},
        },
        mockContext
      );

      expect(result.UserPromptSubmit?.[0]?.hooks[0]?.command).toBe(
        '$CLAUDE_PROJECT_DIR/.claude/scripts/dirty-good-claude-hook.js --staged --unstaged --filenames --diffs'
      );
    });
  });

  describe('hook configuration structure', () => {
    it('should always return UserPromptSubmit configuration', () => {
      const result = dirtyHook.makeHook({}, mockContext);

      expect(result).toHaveProperty('UserPromptSubmit');
      expect(Array.isArray(result.UserPromptSubmit)).toBe(true);
      expect(result.UserPromptSubmit).toHaveLength(1);
    });

    it('should have proper hook command structure', () => {
      const result = dirtyHook.makeHook({}, mockContext);
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
      const result = dirtyHook.makeHook({}, mockContext);
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

      scenarios.forEach(args => {
        const result = dirtyHook.makeHook(args, mockContext);
        expect(result.UserPromptSubmit?.[0]?.hooks[0]?.timeout).toBe(10000);
      });
    });

    it('should not return other hook event types', () => {
      const result = dirtyHook.makeHook({}, mockContext);

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

  describe('error handling', () => {
    it('should handle filesystem errors when creating scripts directory', () => {
      // Create a read-only temp directory to simulate permission error
      const readOnlyDir = path.join(tempDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444); // Remove write permissions

      const readOnlyContext = { settingsDirectoryPath: readOnlyDir };

      expect(() => dirtyHook.makeHook({}, readOnlyContext)).toThrow(
        'Failed to create scripts directory'
      );

      // Clean up
      fs.chmodSync(readOnlyDir, 0o755); // Restore permissions for cleanup
    });

    it('should handle case when scripts directory creation succeeds but write fails', () => {
      // Create scripts directory first
      const scriptsDir = path.join(tempDir, 'scripts');
      fs.mkdirSync(scriptsDir);

      // Make scripts directory read-only to prevent file creation
      fs.chmodSync(scriptsDir, 0o444);

      expect(() => dirtyHook.makeHook({}, mockContext)).toThrow('Failed to write script file');

      // Clean up
      fs.chmodSync(scriptsDir, 0o755); // Restore permissions for cleanup
    });
  });
});
