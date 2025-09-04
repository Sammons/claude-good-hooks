import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplyCommand } from './apply.js';
import * as modules from '../../utils/modules.js';
import * as settings from '../../utils/settings.js';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../../utils/modules.js');
vi.mock('../../utils/settings.js');

const mockLoadHookPlugin = vi.mocked(modules.loadHookPlugin);
const mockAddHookToSettings = vi.mocked(settings.addHookToSettings);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('ApplyCommand - help functionality', () => {
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
    makeHook: (args: Record<string, unknown>, _context: { settingsDirectoryPath: string }) => ({
      PreToolUse: [
        {
          matcher: (args.pattern as string) || '*',
          hooks: [
            {
              type: 'command',
              command: `echo "Test hook with pattern ${args.pattern}"`,
              timeout: args.timeout as number,
            },
          ],
        },
      ],
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset spy call counts
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
    processExitSpy.mockClear();
  });

  it('should display help information in human-readable format', async () => {
    mockLoadHookPlugin.mockResolvedValue(mockPlugin);

    const command = new ApplyCommand();
    await command.execute(['test-hook'], { help: true, parent: {} });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-hook v1.0.0'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('A test hook for unit testing'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('--pattern'));
    expect(mockAddHookToSettings).not.toHaveBeenCalled();
  });

  it('should display help information in JSON format', async () => {
    mockLoadHookPlugin.mockResolvedValue(mockPlugin);

    const command = new ApplyCommand();
    await command.execute(['test-hook'], { help: true, parent: { json: true } });

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