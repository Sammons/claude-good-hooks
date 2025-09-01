import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyCommand } from './apply.js';
import * as modules from '../utils/modules.js';
import * as settings from '../utils/settings.js';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../utils/modules.js');
vi.mock('../utils/settings.js');

const mockLoadHookPlugin = vi.mocked(modules.loadHookPlugin);
const mockAddHookToSettings = vi.mocked(settings.addHookToSettings);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('applyCommand', () => {
  const mockPlugin: HookPlugin = {
    name: 'test-hook',
    description: 'A test hook for unit testing',
    version: '1.0.0',
    customArgs: {
      pattern: {
        description: 'Pattern to match',
        type: 'string',
        required: true,
      },
      timeout: {
        description: 'Timeout in seconds',
        type: 'number',
        default: 60,
      },
      enabled: {
        description: 'Enable the hook',
        type: 'boolean',
        default: true,
      },
    },
    makeHook: (args) => ({
      PreToolUse: [
        {
          matcher: args.pattern || '*',
          hooks: [
            {
              type: 'command',
              command: `echo "Test hook with pattern ${args.pattern}"`,
              timeout: args.timeout,
            },
          ],
        },
      ],
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful hook application', () => {
    it('should apply a hook to project scope by default', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand('test-hook', ['--pattern', 'Write'], { parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('test-hook', undefined);
      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'project',
        'PreToolUse',
        expect.objectContaining({
          matcher: 'Write',
          hooks: expect.arrayContaining([
            expect.objectContaining({
              type: 'command',
              command: 'echo "Test hook with pattern Write"',
            }),
          ]),
        })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Applied hook \'test-hook\' to project settings')
      );
    });

    it('should apply a hook to global scope when global flag is set', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand('test-hook', ['--pattern', 'Edit'], { global: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('test-hook', true);
      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'global',
        'PreToolUse',
        expect.objectContaining({
          matcher: 'Edit',
        })
      );
    });

    it('should apply a hook to local scope when local flag is set', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand('test-hook', ['--pattern', 'Read'], { local: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('test-hook', undefined);
      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'local',
        'PreToolUse',
        expect.objectContaining({
          matcher: 'Read',
        })
      );
    });

    it('should handle hooks with no arguments', async () => {
      const simplePlugin: HookPlugin = {
        ...mockPlugin,
        customArgs: undefined,
        makeHook: () => ({
          PostToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'echo "Simple hook"',
                },
              ],
            },
          ],
        }),
      };

      mockLoadHookPlugin.mockResolvedValue(simplePlugin);

      await applyCommand('simple-hook', [], { parent: {} });

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'project',
        'PostToolUse',
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({
              type: 'command',
              command: 'echo "Simple hook"',
            }),
          ]),
        })
      );
    });
  });

  describe('argument parsing', () => {
    it('should parse string arguments correctly', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand('test-hook', ['--pattern', 'Write|Edit'], { parent: {} });

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'project',
        'PreToolUse',
        expect.objectContaining({
          matcher: 'Write|Edit',
        })
      );
    });

    it('should parse number arguments correctly', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand('test-hook', ['--pattern', 'Write', '--timeout', '120'], { parent: {} });

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'project',
        'PreToolUse',
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({
              timeout: 120,
            }),
          ]),
        })
      );
    });

    it('should parse boolean arguments correctly', async () => {
      const pluginWithBoolean: HookPlugin = {
        ...mockPlugin,
        customArgs: {
          enabled: {
            description: 'Enable the hook',
            type: 'boolean',
            default: false,
          },
        },
        makeHook: (args) => ({
          PreToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: args.enabled ? 'echo "enabled"' : 'echo "disabled"',
                },
              ],
            },
          ],
        }),
      };

      mockLoadHookPlugin.mockResolvedValue(pluginWithBoolean);

      await applyCommand('test-hook', ['--enabled'], { parent: {} });

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'project',
        'PreToolUse',
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({
              command: 'echo "enabled"',
            }),
          ]),
        })
      );
    });

    it('should use default values for missing arguments', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand('test-hook', ['--pattern', 'Write'], { parent: {} });

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'project',
        'PreToolUse',
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({
              timeout: 60, // default value
            }),
          ]),
        })
      );
    });
  });

  describe('help functionality', () => {
    it('should display help information in human-readable format', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand('test-hook', [], { help: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-hook v1.0.0'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('A test hook for unit testing'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('--pattern'));
      expect(mockAddHookToSettings).not.toHaveBeenCalled();
    });

    it('should display help information in JSON format', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand('test-hook', [], { help: true, parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          name: 'test-hook',
          description: 'A test hook for unit testing',
          version: '1.0.0',
          customArgs: mockPlugin.customArgs,
          usage: 'claude-good-hooks apply test-hook [options]',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle hook not found error in human format', async () => {
      mockLoadHookPlugin.mockResolvedValue(null);
      // Mock process.exit to prevent it from actually stopping execution
      processExitSpy.mockImplementation(() => {
        throw new Error('Process exit called');
      });

      await expect(applyCommand('nonexistent-hook', [], { parent: {} })).rejects.toThrow('Process exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hook \'nonexistent-hook\' not found')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle hook not found error in JSON format', async () => {
      mockLoadHookPlugin.mockResolvedValue(null);
      processExitSpy.mockImplementation(() => {
        throw new Error('Process exit called');
      });

      await expect(applyCommand('nonexistent-hook', [], { parent: { json: true } })).rejects.toThrow('Process exit called');

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: 'Hook \'nonexistent-hook\' not found. Make sure it\'s installed.',
        })
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('JSON output format', () => {
    it('should return JSON output when json flag is set', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand('test-hook', ['--pattern', 'Write'], { parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          hook: 'test-hook',
          scope: 'project',
          args: { pattern: 'Write', timeout: 60, enabled: true },
        })
      );
    });

    it('should include parsed arguments in JSON output', async () => {
      mockLoadHookPlugin.mockResolvedValue(mockPlugin);

      await applyCommand(
        'test-hook',
        ['--pattern', 'Edit', '--timeout', '90'],
        { global: true, parent: { json: true } }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          hook: 'test-hook',
          scope: 'global',
          args: { pattern: 'Edit', timeout: 90, enabled: true },
        })
      );
    });
  });
});