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

describe('applyCommand - successful hook application', () => {
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

  it('should apply a hook to project scope by default', async () => {
    mockLoadHookPlugin.mockResolvedValue(mockPlugin);

    await applyCommand('test-hook', ['--pattern', 'Write'], { parent: {} });

    expect(mockLoadHookPlugin).toHaveBeenCalledWith('test-hook', false);
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

    expect(mockLoadHookPlugin).toHaveBeenCalledWith('test-hook', false);
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