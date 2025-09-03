import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listHooks } from './list-hooks.js';
import * as modules from '../../utils/modules.js';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../../utils/modules.js');

const mockGetRemoteHooks = vi.mocked(modules.getRemoteHooks);
const mockLoadHookPlugin = vi.mocked(modules.loadHookPlugin);
const mockGetInstalledHookModules = vi.mocked(modules.getInstalledHookModules);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('listHooks - Remote Hooks', () => {
  const mockRemotePlugin: HookPlugin = {
    name: 'remote-formatter',
    description: 'Remote code formatting hook',
    version: '2.1.0',
  } as HookPlugin;

  const mockLocalPlugin: HookPlugin = {
    name: 'local-linter',
    description: 'Local linting hook',
    version: '1.0.0',
  } as HookPlugin;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic remote hooks listing', () => {
    it('should list remote hooks with installation status', async () => {
      mockGetRemoteHooks.mockReturnValue(['@org/remote-formatter', 'another-remote-hook']);
      mockLoadHookPlugin
        .mockResolvedValueOnce(mockRemotePlugin)
        .mockResolvedValueOnce({
          name: 'another-remote',
          description: 'Another remote hook',
          version: '0.5.0',
        } as HookPlugin);
      mockGetInstalledHookModules
        .mockReturnValueOnce(['@org/remote-formatter']) // First call for remote hook
        .mockReturnValueOnce([]); // Second call for another-remote-hook
      mockGetInstalledHookModules.mockReturnValue(['local-hook']); // Global check

      await listHooks({ parent: {} });

      expect(mockGetRemoteHooks).toHaveBeenCalled();
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('@org/remote-formatter', false);
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('another-remote-hook', false);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available Hooks (project):'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ remote-formatter v2.1.0'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Remote code formatting hook'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Package: @org/remote-formatter'));
    });

    it('should show correct installation status for remote hooks', async () => {
      mockGetRemoteHooks.mockReturnValue(['installed-remote', 'uninstalled-remote']);
      mockLoadHookPlugin.mockResolvedValue(mockRemotePlugin);
      mockGetInstalledHookModules
        .mockReturnValueOnce(['installed-remote']) // First hook is installed
        .mockReturnValueOnce([]); // Second hook is not installed locally
      mockGetInstalledHookModules.mockReturnValue(['other-hook']); // Global installed hooks

      await listHooks({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ remote-formatter'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ remote-formatter'));
    });

    it('should return JSON output for remote hooks', async () => {
      mockGetRemoteHooks.mockReturnValue(['remote-hook']);
      mockLoadHookPlugin.mockResolvedValue(mockRemotePlugin);
      mockGetInstalledHookModules.mockReturnValue(['remote-hook']);

      await listHooks({ json: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify([{
          name: 'remote-formatter',
          description: 'Remote code formatting hook',
          version: '2.1.0',
          source: 'remote',
          packageName: 'remote-hook',
          installed: true,
        }], null, 2))
      );
    });
  });

  describe('global scope remote hooks', () => {
    it('should list remote hooks with global scope when global flag is set', async () => {
      mockGetRemoteHooks.mockReturnValue(['global-remote-hook']);
      mockLoadHookPlugin.mockResolvedValue({
        name: 'global-remote',
        description: 'Global remote hook',
        version: '3.0.0',
      } as HookPlugin);
      mockGetInstalledHookModules.mockReturnValue(['global-remote-hook']);

      await listHooks({ global: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available Hooks (global):'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ global-remote v3.0.0'));
    });

    it('should show correct source in global mode JSON output', async () => {
      mockGetRemoteHooks.mockReturnValue(['remote-hook']);
      mockLoadHookPlugin.mockResolvedValue(mockRemotePlugin);
      mockGetInstalledHookModules.mockReturnValue([]);

      await listHooks({ global: true, json: true, parent: {} });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output[0].source).toBe('global');
    });
  });

  describe('combined remote and local hooks', () => {
    it('should combine remote hooks with locally installed hooks', async () => {
      mockGetRemoteHooks.mockReturnValue(['remote-hook']);
      mockGetInstalledHookModules.mockReturnValue(['local-hook']);
      mockLoadHookPlugin
        .mockResolvedValueOnce(mockRemotePlugin) // Remote hook
        .mockResolvedValueOnce(mockLocalPlugin); // Local hook

      await listHooks({ parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('remote-hook', false);
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('local-hook', false);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('remote-formatter'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('local-linter'));
    });

    it('should handle overlapping remote and local hooks', async () => {
      const sameName = 'duplicate-hook';
      mockGetRemoteHooks.mockReturnValue([sameName]);
      mockGetInstalledHookModules.mockReturnValue([sameName]);
      mockLoadHookPlugin
        .mockResolvedValueOnce({ // Remote version
          name: 'remote-duplicate',
          description: 'Remote version',
          version: '1.0.0',
        } as HookPlugin)
        .mockResolvedValueOnce({ // Local version
          name: 'local-duplicate',
          description: 'Local version',
          version: '2.0.0',
        } as HookPlugin);

      await listHooks({ json: true, parent: {} });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output).toHaveLength(2);
      
      const remoteHook = output.find((h: any) => h.source === 'remote');
      const localHook = output.find((h: any) => h.source === 'local');
      
      expect(remoteHook.name).toBe('remote-duplicate');
      expect(localHook.name).toBe('local-duplicate');
    });
  });

  describe('error scenarios', () => {
    it('should handle remote hook loading failures gracefully', async () => {
      mockGetRemoteHooks.mockReturnValue(['broken-remote-hook']);
      mockLoadHookPlugin.mockResolvedValue(null);
      mockGetInstalledHookModules.mockReturnValue([]);

      await listHooks({ parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('broken-remote-hook', false);
      // Should not crash and should not display the broken hook
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available Hooks (project):'));
    });

    it('should handle getRemoteHooks errors', async () => {
      mockGetRemoteHooks.mockImplementation(() => {
        throw new Error('Failed to read remote hooks config');
      });
      mockGetInstalledHookModules.mockReturnValue([]);

      await expect(listHooks({ parent: {} })).rejects.toThrow(
        'Failed to read remote hooks config'
      );
    });

    it('should handle installation check errors for remote hooks', async () => {
      mockGetRemoteHooks.mockReturnValue(['remote-hook']);
      mockLoadHookPlugin.mockResolvedValue(mockRemotePlugin);
      mockGetInstalledHookModules.mockImplementation(() => {
        throw new Error('npm ls failed');
      });

      await expect(listHooks({ parent: {} })).rejects.toThrow('npm ls failed');
    });
  });

  describe('empty states', () => {
    it('should display "No hooks found" when no remote or local hooks exist', async () => {
      mockGetRemoteHooks.mockReturnValue([]);
      mockGetInstalledHookModules.mockReturnValue([]);

      await listHooks({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hooks found'));
    });

    it('should return empty array in JSON when no hooks found', async () => {
      mockGetRemoteHooks.mockReturnValue([]);
      mockGetInstalledHookModules.mockReturnValue([]);

      await listHooks({ json: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify([], null, 2));
    });

    it('should handle case where remote hooks config exists but is empty', async () => {
      mockGetRemoteHooks.mockReturnValue([]);
      mockGetInstalledHookModules.mockReturnValue(['local-hook']);
      mockLoadHookPlugin.mockResolvedValue(mockLocalPlugin);

      await listHooks({ parent: {} });

      // Should still show local hooks
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('local-linter'));
    });
  });

  describe('remote hook metadata', () => {
    it('should correctly set metadata for remote hooks', async () => {
      mockGetRemoteHooks.mockReturnValue(['@scoped/remote-package']);
      mockLoadHookPlugin.mockResolvedValue({
        name: 'scoped-remote',
        description: 'Scoped remote hook',
        version: '1.5.0',
      } as HookPlugin);
      mockGetInstalledHookModules.mockReturnValue(['@scoped/remote-package']);

      await listHooks({ json: true, parent: {} });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output[0]).toEqual({
        name: 'scoped-remote',
        description: 'Scoped remote hook',
        version: '1.5.0',
        source: 'remote',
        packageName: '@scoped/remote-package',
        installed: true,
      });
    });

    it('should handle uninstalled remote hooks', async () => {
      mockGetRemoteHooks.mockReturnValue(['uninstalled-remote']);
      mockLoadHookPlugin.mockResolvedValue(mockRemotePlugin);
      mockGetInstalledHookModules.mockReturnValue([]); // Not installed

      await listHooks({ json: true, parent: {} });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output[0].installed).toBe(false);
      expect(output[0].source).toBe('remote');
    });
  });

  describe('complex remote configurations', () => {
    it('should handle multiple remote hooks from different sources', async () => {
      mockGetRemoteHooks.mockReturnValue([
        '@org1/hook1',
        '@org2/hook2',
        'standalone-hook',
      ]);
      mockLoadHookPlugin
        .mockResolvedValueOnce({
          name: 'org1-hook',
          description: 'Hook from org1',
          version: '1.0.0',
        } as HookPlugin)
        .mockResolvedValueOnce({
          name: 'org2-hook',
          description: 'Hook from org2',
          version: '2.0.0',
        } as HookPlugin)
        .mockResolvedValueOnce({
          name: 'standalone',
          description: 'Standalone hook',
          version: '0.1.0',
        } as HookPlugin);
      mockGetInstalledHookModules
        .mockReturnValueOnce(['@org1/hook1']) // First hook installed
        .mockReturnValueOnce([]) // Second hook not installed
        .mockReturnValueOnce(['standalone-hook']); // Third hook installed

      await listHooks({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ org1-hook v1.0.0'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ org2-hook v2.0.0'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ standalone v0.1.0'));
    });

    it('should handle remote hooks with version specifiers', async () => {
      mockGetRemoteHooks.mockReturnValue(['hook@1.2.3', 'git+https://github.com/user/repo.git']);
      mockLoadHookPlugin.mockResolvedValue(mockRemotePlugin);
      mockGetInstalledHookModules.mockReturnValue([]);

      await listHooks({ parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('hook@1.2.3', false);
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('git+https://github.com/user/repo.git', false);
    });
  });

  describe('installation status accuracy', () => {
    it('should check local installation first for remote hooks', async () => {
      mockGetRemoteHooks.mockReturnValue(['test-hook']);
      mockLoadHookPlugin.mockResolvedValue(mockRemotePlugin);
      mockGetInstalledHookModules
        .mockReturnValueOnce(['test-hook']) // Local check - installed
        .mockReturnValueOnce([]); // Should not reach this for the same hook

      await listHooks({ json: true, parent: {} });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output[0].installed).toBe(true);
      
      // Should have been called once per remote hook to check if it's installed locally
      expect(mockGetInstalledHookModules).toHaveBeenCalledWith(false);
    });

    it('should accurately report installation status in human-readable format', async () => {
      mockGetRemoteHooks.mockReturnValue(['installed-hook', 'uninstalled-hook']);
      mockLoadHookPlugin
        .mockResolvedValueOnce({
          name: 'installed',
          description: 'Installed hook',
          version: '1.0.0',
        } as HookPlugin)
        .mockResolvedValueOnce({
          name: 'uninstalled',
          description: 'Uninstalled hook',
          version: '1.0.0',
        } as HookPlugin);
      mockGetInstalledHookModules
        .mockReturnValueOnce(['installed-hook']) // First hook is installed
        .mockReturnValueOnce([]); // Second hook is not installed
      mockGetInstalledHookModules.mockReturnValue([]);

      await listHooks({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ installed v1.0.0'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ uninstalled v1.0.0'));
    });
  });

  describe('performance considerations', () => {
    it('should handle large numbers of remote hooks efficiently', async () => {
      const manyRemoteHooks = Array.from({ length: 50 }, (_, i) => `hook-${i}`);
      mockGetRemoteHooks.mockReturnValue(manyRemoteHooks);
      mockLoadHookPlugin.mockResolvedValue(mockRemotePlugin);
      mockGetInstalledHookModules.mockReturnValue([]);

      await listHooks({ json: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledTimes(50);
      expect(mockGetInstalledHookModules).toHaveBeenCalledTimes(50 + 1); // 50 for remote hooks + 1 for local
      
      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output).toHaveLength(50);
    });
  });
});