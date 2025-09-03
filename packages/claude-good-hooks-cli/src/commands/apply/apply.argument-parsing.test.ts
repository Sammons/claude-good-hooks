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
const _consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const _consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const _processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('ApplyCommand - argument parsing', () => {
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
  });

  it('should parse string arguments correctly', async () => {
    mockLoadHookPlugin.mockResolvedValue(mockPlugin);

    const command = new ApplyCommand();
    await command.execute(['test-hook', '--pattern', 'Write|Edit'], { parent: {} });

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

    const command = new ApplyCommand();
    await command.execute(['test-hook', '--pattern', 'Write', '--timeout', '120'], { parent: {} });

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

    const command = new ApplyCommand();
    await command.execute(['test-hook', '--enabled'], { parent: {} });

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

    const command = new ApplyCommand();
    await command.execute(['test-hook', '--pattern', 'Write'], { parent: {} });

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