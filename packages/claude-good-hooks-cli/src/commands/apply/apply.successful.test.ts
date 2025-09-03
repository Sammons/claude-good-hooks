import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplyCommand } from './apply.js';
import { HookService } from '../../services/hook.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

// Mock services
const mockHookService = {
  applyHook: vi.fn(),
  getHookHelp: vi.fn(),
  loadHookPlugin: vi.fn(),
  addHookToSettings: vi.fn(),
} as any;

const mockProcessService = {
  exit: vi.fn(),
} as any;

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('ApplyCommand - successful hook application', () => {
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

    const command = new ApplyCommand();
    await command.execute(['test-hook', '--pattern', 'Write'], { parent: {} });

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

    const command = new ApplyCommand();
    await command.execute(['test-hook', '--pattern', 'Edit'], { global: true, parent: {} });

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

    const command = new ApplyCommand();
    await command.execute(['test-hook', '--pattern', 'Read'], { local: true, parent: {} });

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

    const command = new ApplyCommand();
    await command.execute(['simple-hook'], { parent: {} });

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