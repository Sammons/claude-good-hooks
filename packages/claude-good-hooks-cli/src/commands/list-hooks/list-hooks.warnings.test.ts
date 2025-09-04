import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListHooksCommand } from './list-hooks.js';
import { HookService } from '../../services/hook.service.js';
import { ModuleService } from '../../services/module.service.js';
import type { HookMetadata, HookConfiguration } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../../services/hook.service.js');
vi.mock('../../services/module.service.js');

const mockHookService = vi.mocked(HookService);
const mockModuleService = vi.mocked(ModuleService);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('ListHooksCommand - Warning Messages', () => {
  let command: ListHooksCommand;
  let mockHookServiceInstance: any;
  let mockModuleServiceInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockHookServiceInstance = {
      listInstalledHooks: vi.fn(),
      listAvailableHooks: vi.fn(),
    };
    
    mockModuleServiceInstance = {
      extractModuleNameFromHookName: vi.fn(),
      isModuleInstalled: vi.fn(),
      isPluginExported: vi.fn(),
      getModuleVersion: vi.fn(),
    };

    mockHookService.mockImplementation(() => mockHookServiceInstance);
    mockModuleService.mockImplementation(() => mockModuleServiceInstance);
    
    command = new ListHooksCommand();
  });

  it('should show plugin not found warning when module exists but plugin is not exported', async () => {
    const hookConfig: HookConfiguration = {
      claudegoodhooks: {
        name: '@test/module-name/hook-name',
        description: 'Test hook',
        version: '1.0.0',
        hookFactoryArguments: { test: true }
      },
      matcher: 'Write',
      hooks: [{ type: 'command', command: 'echo "test"' }]
    };

    const mockHook: HookMetadata = {
      name: 'test-hook',
      description: 'Test hook',
      version: '1.0.0',
      source: 'local',
      installed: true,
      hookConfiguration: hookConfig,
    };

    mockHookServiceInstance.listInstalledHooks.mockResolvedValue([mockHook]);
    mockModuleServiceInstance.extractModuleNameFromHookName.mockReturnValue('@test/module-name');
    mockModuleServiceInstance.isModuleInstalled.mockReturnValue(true);
    mockModuleServiceInstance.isPluginExported.mockResolvedValue(false); // Plugin not exported
    mockModuleServiceInstance.getModuleVersion.mockReturnValue('1.0.0');

    await command.execute([], { installed: true });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('⚠ Plugin not found in module: The hook may have been removed or renamed')
    );
  });

  it('should show missing hookFactoryArguments warning', async () => {
    const hookConfig: HookConfiguration = {
      claudegoodhooks: {
        name: '@test/module-name/hook-name',
        description: 'Test hook',
        version: '1.0.0',
        // Missing hookFactoryArguments
      },
      matcher: 'Write',
      hooks: [{ type: 'command', command: 'echo "test"' }]
    };

    const mockHook: HookMetadata = {
      name: 'test-hook',
      description: 'Test hook',
      version: '1.0.0',
      source: 'local',
      installed: true,
      hookConfiguration: hookConfig,
    };

    mockHookServiceInstance.listInstalledHooks.mockResolvedValue([mockHook]);
    mockModuleServiceInstance.extractModuleNameFromHookName.mockReturnValue('@test/module-name');
    mockModuleServiceInstance.isModuleInstalled.mockReturnValue(true);
    mockModuleServiceInstance.isPluginExported.mockResolvedValue(true);
    mockModuleServiceInstance.getModuleVersion.mockReturnValue('1.0.0');

    await command.execute([], { installed: true });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('⚠ Cannot regenerate: Missing hookFactoryArguments (applied with older version)')
    );
  });

  it('should show both warnings when both conditions are met', async () => {
    const hookConfig: HookConfiguration = {
      claudegoodhooks: {
        name: '@test/module-name/hook-name',
        description: 'Test hook',
        version: '1.0.0',
        // Missing hookFactoryArguments
      },
      matcher: 'Write',
      hooks: [{ type: 'command', command: 'echo "test"' }]
    };

    const mockHook: HookMetadata = {
      name: 'test-hook',
      description: 'Test hook',
      version: '1.0.0',
      source: 'local',
      installed: true,
      hookConfiguration: hookConfig,
    };

    mockHookServiceInstance.listInstalledHooks.mockResolvedValue([mockHook]);
    mockModuleServiceInstance.extractModuleNameFromHookName.mockReturnValue('@test/module-name');
    mockModuleServiceInstance.isModuleInstalled.mockReturnValue(true);
    mockModuleServiceInstance.isPluginExported.mockResolvedValue(false); // Plugin not exported
    mockModuleServiceInstance.getModuleVersion.mockReturnValue('1.0.0');

    await command.execute([], { installed: true });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('⚠ Plugin not found in module: The hook may have been removed or renamed')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('⚠ Cannot regenerate: Missing hookFactoryArguments (applied with older version)')
    );
  });

  it('should not show plugin warnings when module is not installed', async () => {
    const hookConfig: HookConfiguration = {
      claudegoodhooks: {
        name: '@test/module-name/hook-name',
        description: 'Test hook',
        version: '1.0.0',
      },
      matcher: 'Write',
      hooks: [{ type: 'command', command: 'echo "test"' }]
    };

    const mockHook: HookMetadata = {
      name: 'test-hook',
      description: 'Test hook',
      version: '1.0.0',
      source: 'local',
      installed: true,
      hookConfiguration: hookConfig,
    };

    mockHookServiceInstance.listInstalledHooks.mockResolvedValue([mockHook]);
    mockModuleServiceInstance.extractModuleNameFromHookName.mockReturnValue('@test/module-name');
    mockModuleServiceInstance.isModuleInstalled.mockReturnValue(false); // Module not installed
    mockModuleServiceInstance.getModuleVersion.mockReturnValue(null);

    await command.execute([], { installed: true });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('⚠ Module not found: @test/module-name - This hook may not work correctly')
    );
    // Should not call isPluginExported when module is not installed
    expect(mockModuleServiceInstance.isPluginExported).not.toHaveBeenCalled();
  });

  it('should not show warnings when hook has no claudegoodhooks.name', async () => {
    const hookConfig: HookConfiguration = {
      matcher: 'Write',
      hooks: [{ type: 'command', command: 'echo "test"' }]
      // No claudegoodhooks property
    };

    const mockHook: HookMetadata = {
      name: 'test-hook',
      description: 'Test hook',
      version: '1.0.0',
      source: 'local',
      installed: true,
      hookConfiguration: hookConfig,
    };

    mockHookServiceInstance.listInstalledHooks.mockResolvedValue([mockHook]);

    await command.execute([], { installed: true });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('⚠ This hook is not managed, and cannot be modified through claude-good-hooks')
    );
    expect(mockModuleServiceInstance.extractModuleNameFromHookName).not.toHaveBeenCalled();
    expect(mockModuleServiceInstance.isModuleInstalled).not.toHaveBeenCalled();
    expect(mockModuleServiceInstance.isPluginExported).not.toHaveBeenCalled();
  });

  it('should show no warnings when all conditions are good', async () => {
    const hookConfig: HookConfiguration = {
      claudegoodhooks: {
        name: '@test/module-name/hook-name',
        description: 'Test hook',
        version: '1.0.0',
        hookFactoryArguments: { test: true }
      },
      matcher: 'Write',
      hooks: [{ type: 'command', command: 'echo "test"' }]
    };

    const mockHook: HookMetadata = {
      name: 'test-hook',
      description: 'Test hook',
      version: '1.0.0',
      source: 'local',
      installed: true,
      hookConfiguration: hookConfig,
    };

    mockHookServiceInstance.listInstalledHooks.mockResolvedValue([mockHook]);
    mockModuleServiceInstance.extractModuleNameFromHookName.mockReturnValue('@test/module-name');
    mockModuleServiceInstance.isModuleInstalled.mockReturnValue(true);
    mockModuleServiceInstance.isPluginExported.mockResolvedValue(true);
    mockModuleServiceInstance.getModuleVersion.mockReturnValue('1.0.0');

    await command.execute([], { installed: true });

    // Should not show any warning messages
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('⚠'));
  });
});