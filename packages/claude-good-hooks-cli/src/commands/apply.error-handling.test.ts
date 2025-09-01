import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyCommand } from './apply.js';
import * as modules from '../utils/modules.js';
import * as settings from '../utils/settings.js';

// Mock dependencies
vi.mock('../utils/modules.js');
vi.mock('../utils/settings.js');

const mockLoadHookPlugin = vi.mocked(modules.loadHookPlugin);
const mockAddHookToSettings = vi.mocked(settings.addHookToSettings);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('applyCommand - error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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