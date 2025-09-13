import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplyCommand } from './apply.js';
import type { HookService } from '../../services/hook.service.js';
import type { ProcessService } from '../../services/process.service.js';

// Mock the services
const mockHookService = {
  regenerateHooks: vi.fn(),
} as unknown as HookService;

const mockProcessService = {
  exit: vi.fn(),
} as unknown as ProcessService;

describe('ApplyCommand --regenerate', () => {
  let applyCommand: ApplyCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    applyCommand = new ApplyCommand(mockHookService, mockProcessService);
  });

  it('should accept --regenerate flag without hook name', () => {
    const validation = applyCommand.validate([], { regenerate: true });
    expect(validation).toEqual({
      valid: true,
      result: { regenerate: true },
    });
  });

  it('should require hook name when --regenerate flag is not set', () => {
    const validation = applyCommand.validate([], {});
    expect(validation).toEqual({
      valid: false,
      errors: ['Hook name is required unless using --regenerate or --help flag'],
    });
  });

  it('should accept hook name with --regenerate flag', () => {
    const validation = applyCommand.validate(['@sammons/git-dirty-hook/dirty'], {
      regenerate: true,
    });
    expect(validation).toEqual({
      valid: true,
      result: { regenerate: true },
    });
  });

  it('should call regenerateHooks when --regenerate flag is set', async () => {
    const mockResult = {
      results: [],
      totalProcessed: 0,
      successCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };

    (mockHookService.regenerateHooks as any).mockResolvedValue(mockResult);

    // Mock console.log to prevent output during test
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await applyCommand.execute([], { regenerate: true, parent: { json: true } });

    expect(mockHookService.regenerateHooks).toHaveBeenCalledWith(undefined, 'project');
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockResult));

    consoleSpy.mockRestore();
  });

  it('should call regenerateHooks with specific hook name when provided', async () => {
    const hookName = '@sammons/git-dirty-hook/dirty';
    const mockResult = {
      results: [],
      totalProcessed: 0,
      successCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };

    (mockHookService.regenerateHooks as any).mockResolvedValue(mockResult);

    // Mock console.log to prevent output during test
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await applyCommand.execute([hookName], {
      regenerate: true,
      global: true,
      parent: { json: true },
    });

    expect(mockHookService.regenerateHooks).toHaveBeenCalledWith(hookName, 'global');
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockResult));

    consoleSpy.mockRestore();
  });

  it('should include --regenerate in help options', () => {
    const help = applyCommand.getHelp();

    const regenerateOption = help.options?.find(opt => opt.name === 'regenerate');
    expect(regenerateOption).toBeDefined();
    expect(regenerateOption?.description).toBe('Regenerate existing hooks to latest version');
    expect(regenerateOption?.type).toBe('boolean');
  });

  it('should include --regenerate examples in help', () => {
    const help = applyCommand.getHelp();

    expect(help.examples).toContain('claude-good-hooks apply --regenerate');
    expect(help.examples).toContain(
      'claude-good-hooks apply --regenerate @sammons/git-dirty-hook'
    );
  });
});
