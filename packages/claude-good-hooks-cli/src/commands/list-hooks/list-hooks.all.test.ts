import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListHooksCommand } from './list-hooks.js';
import * as settingsModule from '../../utils/settings.js';
import * as modulesModule from '../../utils/modules.js';
import type { HookPlugin, HookMetadata } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../../utils/settings.js');
vi.mock('../../utils/modules.js');
vi.mock('chalk', () => ({
  default: {
    green: vi.fn(text => `✓ ${text}`),
    red: vi.fn(text => `✗ ${text}`),
    yellow: vi.fn(text => `⚠ ${text}`),
    dim: vi.fn(text => `${text}`),
    bold: vi.fn(text => `**${text}**`),
    cyan: vi.fn(text => text),
  }
}));

const mockReadSettings = vi.mocked(settingsModule.readSettings);
const mockGetInstalledHookModules = vi.mocked(modulesModule.getInstalledHookModules);
const mockGetRemoteHooks = vi.mocked(modulesModule.getRemoteHooks);
const mockLoadHookPlugin = vi.mocked(modulesModule.loadHookPlugin);

// Sample data for testing
const sampleHookPlugin: HookPlugin = {
  name: 'dirty-good-claude-hook',
  description: 'Git dirty state hook for Claude',
  version: '1.2.0',
  customArgs: {
    staged: { description: 'Only staged files', type: 'boolean' },
  },
  makeHook: () => ({
    PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'git status' }] }]
  })
};

describe('List Hooks Command - All Available', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Available Hooks Listing', () => {
    it('should list both remote and local hooks when not filtering to installed only', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['remote-hook-1', 'remote-hook-2']);
      mockGetInstalledHookModules.mockReturnValue(['local-hook']);
      
      const remoteHook: HookPlugin = {
        name: 'remote-git-hook',
        description: 'Remote git hook',
        version: '2.0.0',
        makeHook: () => ({})
      };
      
      mockLoadHookPlugin
        .mockResolvedValueOnce(remoteHook) // remote-hook-1
        .mockResolvedValueOnce(null) // remote-hook-2 fails to load
        .mockResolvedValueOnce(sampleHookPlugin); // local-hook

      // Execute
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify both remote and local loading
      expect(mockGetRemoteHooks).toHaveBeenCalled();
      expect(mockGetInstalledHookModules).toHaveBeenCalledWith(false);
      
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('remote-hook-1', false);
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('remote-hook-2', false);
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('local-hook', false);

      // Verify output includes both types
      expect(consoleLogSpy).toHaveBeenCalledWith('✗ **remote-git-hook** v2.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Remote git hook');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ **dirty-good-claude-hook** v1.2.0');
    });

    it('should indicate installation status correctly', async () => {
      // Setup - remote hook that is also installed locally
      mockGetRemoteHooks.mockReturnValue(['shared-hook']);
      mockGetInstalledHookModules
        .mockReturnValueOnce(['shared-hook']) // First call for remote check
        .mockReturnValueOnce(['shared-hook']); // Second call for installed hooks
      
      mockLoadHookPlugin
        .mockResolvedValueOnce(sampleHookPlugin) // remote loading
        .mockResolvedValueOnce(sampleHookPlugin); // installed loading

      // Execute
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify - should show as installed (✓)
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ **dirty-good-claude-hook** v1.2.0');
    });

    it('should show hooks from global scope when global flag is set', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue([]);
      mockGetInstalledHookModules.mockReturnValue(['global-installed-hook']);
      mockLoadHookPlugin.mockResolvedValue(sampleHookPlugin);

      // Execute
      const command = new ListHooksCommand();
    await command.execute([], { global: true, parent: {} });

      // Verify global scope
      expect(mockGetInstalledHookModules).toHaveBeenCalledWith(true);
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('global-installed-hook', true);
      expect(consoleLogSpy).toHaveBeenCalledWith('**\nAvailable Hooks (global):\n**');
    });

    it('should output JSON format for available hooks', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['remote-hook']);
      mockGetInstalledHookModules
        .mockReturnValueOnce([]) // remote check
        .mockReturnValueOnce(['local-hook']); // installed hooks
      
      mockLoadHookPlugin
        .mockResolvedValueOnce(sampleHookPlugin) // remote
        .mockResolvedValueOnce(sampleHookPlugin); // local

      // Execute
      const command = new ListHooksCommand();
    await command.execute([], { parent: { json: true } });

      // Verify JSON structure
      const jsonOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(Array.isArray(jsonOutput)).toBe(true);
      expect(jsonOutput).toHaveLength(2);

      // Remote hook
      const remoteHook = jsonOutput.find((h: HookMetadata) => h.source === 'remote');
      expect(remoteHook).toEqual({
        name: 'dirty-good-claude-hook',
        description: 'Git dirty state hook for Claude',
        version: '1.2.0',
        source: 'remote',
        packageName: 'remote-hook',
        installed: false,
      });

      // Local hook
      const localHook = jsonOutput.find((h: HookMetadata) => h.source === 'local');
      expect(localHook).toEqual({
        name: 'dirty-good-claude-hook',
        description: 'Git dirty state hook for Claude',
        version: '1.2.0',
        source: 'local',
        packageName: 'local-hook',
        installed: true,
      });
    });
  });

  describe('Edge Cases for Available Hooks', () => {
    it('should handle very long hook names and descriptions', async () => {
      // Setup
      const longNameHook: HookPlugin = {
        name: 'a-very-long-hook-name-that-exceeds-normal-lengths',
        description: 'This is an extremely long description that goes on and on and on and might cause formatting issues in the console output if not handled properly',
        version: '1.0.0',
        makeHook: () => ({})
      };
      
      mockGetRemoteHooks.mockReturnValue(['long-hook']);
      mockGetInstalledHookModules.mockReturnValue([]);
      mockLoadHookPlugin.mockResolvedValue(longNameHook);

      // Execute - should not crash or break formatting
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith('✗ **a-very-long-hook-name-that-exceeds-normal-lengths** v1.0.0');
    });

    it('should handle duplicate hooks from different sources', async () => {
      // Setup - same hook appears as both remote and installed
      mockGetRemoteHooks.mockReturnValue(['duplicate-hook']);
      mockGetInstalledHookModules
        .mockReturnValueOnce(['duplicate-hook']) // check during remote processing
        .mockReturnValueOnce(['duplicate-hook']); // installed processing
      
      mockLoadHookPlugin
        .mockResolvedValueOnce(sampleHookPlugin) // remote
        .mockResolvedValueOnce(sampleHookPlugin); // installed

      // Execute
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify - should show both entries
      const calls = consoleLogSpy.mock.calls.map(call => call[0]);
      const hookLines = calls.filter(call => call.includes('dirty-good-claude-hook'));
      expect(hookLines).toHaveLength(2); // One remote, one local
    });

    it('should handle no available hooks gracefully', async () => {
      // Setup - no hooks available anywhere
      mockGetRemoteHooks.mockReturnValue([]);
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockReturnValue({});

      // Execute
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith('⚠ No hooks found');
    });

    it('should handle remote hook loading failures gracefully', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['failing-remote-hook']);
      mockGetInstalledHookModules.mockReturnValue([]);
      mockLoadHookPlugin.mockRejectedValue(new Error('Remote loading failed'));

      // Execute - should not crash
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify - should handle gracefully
      expect(consoleLogSpy).toHaveBeenCalledWith('⚠ No hooks found');
    });

    it('should handle mixed remote and local loading success/failure', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['remote-good', 'remote-bad']);
      mockGetInstalledHookModules
        .mockReturnValueOnce([]) // remote check
        .mockReturnValueOnce(['local-good', 'local-bad']); // installed hooks
      
      mockLoadHookPlugin
        .mockResolvedValueOnce(sampleHookPlugin) // remote-good
        .mockResolvedValueOnce(null) // remote-bad fails
        .mockResolvedValueOnce({ ...sampleHookPlugin, name: 'local-hook' }) // local-good
        .mockResolvedValueOnce(null); // local-bad fails

      // Execute
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify - should show successful loads only
      expect(consoleLogSpy).toHaveBeenCalledWith('✗ **dirty-good-claude-hook** v1.2.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ **local-hook** v1.2.0');
      // Bad hooks should not appear
    });

    it('should handle remote hooks service being unavailable', async () => {
      // Setup
      mockGetRemoteHooks.mockImplementation(() => {
        throw new Error('Remote service unavailable');
      });
      mockGetInstalledHookModules.mockReturnValue(['local-hook']);
      mockLoadHookPlugin.mockResolvedValue(sampleHookPlugin);

      // Execute - should not crash
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify - should still show local hooks
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ **dirty-good-claude-hook** v1.2.0');
    });
  });

  describe('Source Detection and Display', () => {
    it('should correctly identify remote vs local sources', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['remote-only']);
      mockGetInstalledHookModules
        .mockReturnValueOnce([]) // remote check - not installed
        .mockReturnValueOnce(['local-only']); // installed hooks
      
      mockLoadHookPlugin
        .mockResolvedValueOnce(sampleHookPlugin) // remote-only
        .mockResolvedValueOnce({ ...sampleHookPlugin, name: 'local-hook' }); // local-only

      // Execute
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify source indicators
      expect(consoleLogSpy).toHaveBeenCalledWith('✗ **dirty-good-claude-hook** v1.2.0'); // Remote (not installed)
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ **local-hook** v1.2.0'); // Local (installed)
    });

    it('should show package information for different sources', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['remote-package']);
      mockGetInstalledHookModules
        .mockReturnValueOnce([])
        .mockReturnValueOnce(['local-package']);
      
      mockLoadHookPlugin
        .mockResolvedValueOnce(sampleHookPlugin)
        .mockResolvedValueOnce(sampleHookPlugin);

      // Execute
      const command = new ListHooksCommand();
    await command.execute([], { parent: {} });

      // Verify package info display
      expect(consoleLogSpy).toHaveBeenCalledWith('  Package: remote-package');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Package: local-package');
    });
  });
});