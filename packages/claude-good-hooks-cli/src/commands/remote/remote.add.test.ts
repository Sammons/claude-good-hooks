import { describe, it, expect, beforeEach, vi } from 'vitest';
import { remoteCommand } from './remote.js';
import * as modules from '../../utils/modules.js';

// Mock dependencies
vi.mock('../../utils/modules.js');

const mockIsModuleInstalled = vi.mocked(modules.isModuleInstalled);
const mockAddRemoteHook = vi.mocked(modules.addRemoteHook);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('remoteCommand - Add Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful remote hook addition', () => {
    it('should add a remote hook when module is locally installed', async () => {
      mockIsModuleInstalled
        .mockReturnValueOnce(true) // local check returns true
        .mockReturnValueOnce(false); // global check not reached

      await remoteCommand({ add: 'my-awesome-hook', parent: {} });

      expect(mockIsModuleInstalled).toHaveBeenCalledWith('my-awesome-hook', false);
      expect(mockAddRemoteHook).toHaveBeenCalledWith('my-awesome-hook');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Added remote hook: my-awesome-hook')
      );
    });

    it('should add a remote hook when module is globally installed', async () => {
      mockIsModuleInstalled
        .mockReturnValueOnce(false) // local check returns false
        .mockReturnValueOnce(true); // global check returns true

      await remoteCommand({ add: '@org/custom-hook', parent: {} });

      expect(mockIsModuleInstalled).toHaveBeenCalledWith('@org/custom-hook', false);
      expect(mockIsModuleInstalled).toHaveBeenCalledWith('@org/custom-hook', true);
      expect(mockAddRemoteHook).toHaveBeenCalledWith('@org/custom-hook');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Added remote hook: @org/custom-hook')
      );
    });

    it('should return JSON output when json flag is set', async () => {
      mockIsModuleInstalled.mockReturnValue(true);

      await remoteCommand({ add: 'json-hook', parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'added',
          module: 'json-hook',
        })
      );
    });

    it('should return JSON output when local json flag is set', async () => {
      mockIsModuleInstalled.mockReturnValue(true);

      await remoteCommand({ add: 'local-json-hook', json: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'added',
          module: 'local-json-hook',
        })
      );
    });
  });

  describe('module installation validation', () => {
    it('should fail when module is not installed locally or globally', async () => {
      mockIsModuleInstalled.mockReturnValue(false);
      processExitSpy.mockImplementation(() => {
        throw new Error('Process exit called');
      });

      await expect(remoteCommand({ add: 'nonexistent-hook', parent: {} })).rejects.toThrow('Process exit called');

      expect(mockIsModuleInstalled).toHaveBeenCalledWith('nonexistent-hook', false);
      expect(mockIsModuleInstalled).toHaveBeenCalledWith('nonexistent-hook', true);
      expect(mockAddRemoteHook).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Module nonexistent-hook is not installed. Please install it first using:'
        )
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should provide installation instructions in error message', async () => {
      mockIsModuleInstalled.mockReturnValue(false);

      await remoteCommand({ add: 'missing-module', parent: {} });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('npm install missing-module')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('npm install -g missing-module')
      );
    });

    it('should return JSON error when module is not installed', async () => {
      mockIsModuleInstalled.mockReturnValue(false);
      processExitSpy.mockImplementation(() => {
        throw new Error('Process exit called');
      });

      await expect(remoteCommand({ add: 'missing-json-hook', parent: { json: true } })).rejects.toThrow('Process exit called');

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: expect.stringContaining(
            'Module missing-json-hook is not installed. Please install it first'
          ),
        })
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('scoped package names', () => {
    it('should handle scoped npm packages correctly', async () => {
      mockIsModuleInstalled.mockReturnValue(true);

      await remoteCommand({ add: '@myorg/my-hook-package', parent: {} });

      expect(mockIsModuleInstalled).toHaveBeenCalledWith('@myorg/my-hook-package', false);
      expect(mockAddRemoteHook).toHaveBeenCalledWith('@myorg/my-hook-package');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Added remote hook: @myorg/my-hook-package')
      );
    });

    it('should handle complex scoped package names', async () => {
      mockIsModuleInstalled.mockReturnValue(true);

      await remoteCommand({
        add: '@company-name/project-hooks-collection',
        parent: { json: true },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'added',
          module: '@company-name/project-hooks-collection',
        })
      );
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle module installation check errors gracefully', async () => {
      mockIsModuleInstalled.mockImplementation(() => {
        throw new Error('File system access error');
      });
      processExitSpy.mockImplementation(() => {
        throw new Error('Process exit called');
      });

      await expect(remoteCommand({ add: 'problematic-hook', parent: {} })).rejects.toThrow('Process exit called');

      // Should treat as not installed and show the standard error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Module problematic-hook is not installed')
      );
    });

    it('should handle addRemoteHook errors gracefully', async () => {
      mockIsModuleInstalled.mockReturnValue(true);
      mockAddRemoteHook.mockImplementation(() => {
        throw new Error('Configuration file write error');
      });

      await expect(
        remoteCommand({ add: 'error-prone-hook', parent: {} })
      ).rejects.toThrow('Configuration file write error');
    });

    it('should handle very long package names', async () => {
      const longPackageName = '@very-long-organization-name/extremely-descriptive-hook-package-name-that-exceeds-normal-limits';
      mockIsModuleInstalled.mockReturnValue(true);

      await remoteCommand({ add: longPackageName, parent: { json: true } });

      expect(mockAddRemoteHook).toHaveBeenCalledWith(longPackageName);
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'added',
          module: longPackageName,
        })
      );
    });

    it('should handle special characters in package names', async () => {
      const specialPackageName = '@my-org/hook_package-2.0';
      mockIsModuleInstalled.mockReturnValue(true);

      await remoteCommand({ add: specialPackageName, parent: {} });

      expect(mockAddRemoteHook).toHaveBeenCalledWith(specialPackageName);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Added remote hook: ${specialPackageName}`)
      );
    });
  });

  describe('installation detection priority', () => {
    it('should prioritize local installation over global', async () => {
      mockIsModuleInstalled
        .mockReturnValueOnce(true) // local check returns true
        .mockReturnValueOnce(false); // global check should not be reached

      await remoteCommand({ add: 'dual-install-hook', parent: {} });

      expect(mockIsModuleInstalled).toHaveBeenCalledWith('dual-install-hook', false);
      expect(mockIsModuleInstalled).toHaveBeenCalledTimes(1); // Should not check global
      expect(mockAddRemoteHook).toHaveBeenCalledWith('dual-install-hook');
    });

    it('should check global installation when local fails', async () => {
      mockIsModuleInstalled
        .mockReturnValueOnce(false) // local check returns false
        .mockReturnValueOnce(true); // global check returns true

      await remoteCommand({ add: 'global-only-hook', parent: {} });

      expect(mockIsModuleInstalled).toHaveBeenCalledWith('global-only-hook', false);
      expect(mockIsModuleInstalled).toHaveBeenCalledWith('global-only-hook', true);
      expect(mockAddRemoteHook).toHaveBeenCalledWith('global-only-hook');
    });

    it('should handle both local and global installation checks failing', async () => {
      mockIsModuleInstalled.mockReturnValue(false);

      await remoteCommand({ add: 'nowhere-hook', parent: {} });

      expect(mockIsModuleInstalled).toHaveBeenCalledWith('nowhere-hook', false);
      expect(mockIsModuleInstalled).toHaveBeenCalledWith('nowhere-hook', true);
      expect(mockAddRemoteHook).not.toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('multiple hook additions', () => {
    it('should handle adding the same hook multiple times', async () => {
      mockIsModuleInstalled.mockReturnValue(true);

      await remoteCommand({ add: 'duplicate-hook', parent: {} });
      await remoteCommand({ add: 'duplicate-hook', parent: {} });

      expect(mockAddRemoteHook).toHaveBeenCalledWith('duplicate-hook');
      expect(mockAddRemoteHook).toHaveBeenCalledTimes(2);
      // The actual deduplication should happen in addRemoteHook implementation
    });
  });

  describe('chalk formatting', () => {
    it('should use green color for success messages', async () => {
      mockIsModuleInstalled.mockReturnValue(true);

      await remoteCommand({ add: 'colored-hook', parent: {} });

      // We can't easily test chalk colors, but we can verify the message content
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Added remote hook: colored-hook')
      );
    });

    it('should use red color for error messages', async () => {
      mockIsModuleInstalled.mockReturnValue(false);

      await remoteCommand({ add: 'error-hook', parent: {} });

      // Error message should be displayed in red via chalk
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Module error-hook is not installed')
      );
    });
  });
});