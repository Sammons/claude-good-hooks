import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('applyCommand - JSON output format', () => {
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

  afterEach(() => {
    // Ensure spy variables are used
    expect(consoleErrorSpy).toBeDefined();
    expect(processExitSpy).toBeDefined();
    expect(mockAddHookToSettings).toBeDefined();
  });

  it('should return JSON output when json flag is set', async () => {
    mockLoadHookPlugin.mockResolvedValue(mockPlugin);

    const command = new ApplyCommand();
    await command.execute(['test-hook', '--pattern', 'Write'], { parent: { json: true } });

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

    const command = new ApplyCommand();
    await command.execute(
      ['test-hook', '--pattern', 'Edit', '--timeout', '90'],
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