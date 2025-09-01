import { describe, it, expect, beforeEach, vi } from 'vitest';
import { remoteCommand } from './remote.js';
import * as modules from '../utils/modules.js';

// Mock dependencies
vi.mock('../utils/modules.js');

const mockRemoveRemoteHook = vi.mocked(modules.removeRemoteHook);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('remoteCommand - Remove Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful remote hook removal', () => {
    it('should remove a remote hook successfully', async () => {
      await remoteCommand({ remove: 'unwanted-hook', parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('unwanted-hook');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed remote hook: unwanted-hook')
      );
    });

    it('should return JSON output when json flag is set', async () => {
      await remoteCommand({ remove: 'json-remove-hook', parent: { json: true } });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('json-remove-hook');
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: 'json-remove-hook',
        })
      );
    });

    it('should return JSON output when local json flag is set', async () => {
      await remoteCommand({ remove: 'local-json-remove', json: true, parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('local-json-remove');
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: 'local-json-remove',
        })
      );
    });
  });

  describe('scoped package removal', () => {
    it('should handle scoped npm packages correctly', async () => {
      await remoteCommand({ remove: '@myorg/old-hook-package', parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('@myorg/old-hook-package');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed remote hook: @myorg/old-hook-package')
      );
    });

    it('should handle complex scoped package names in JSON mode', async () => {
      await remoteCommand({
        remove: '@company-name/deprecated-hooks-collection',
        parent: { json: true },
      });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('@company-name/deprecated-hooks-collection');
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: '@company-name/deprecated-hooks-collection',
        })
      );
    });
  });

  describe('removal behavior', () => {
    it('should always attempt removal regardless of installation status', async () => {
      // Unlike add, remove doesn't check if module is installed
      await remoteCommand({ remove: 'possibly-nonexistent-hook', parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('possibly-nonexistent-hook');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed remote hook: possibly-nonexistent-hook')
      );
    });

    it('should remove hook that was never actually installed', async () => {
      await remoteCommand({ remove: 'ghost-hook', parent: { json: true } });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('ghost-hook');
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: 'ghost-hook',
        })
      );
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle removeRemoteHook errors gracefully', async () => {
      mockRemoveRemoteHook.mockImplementation(() => {
        throw new Error('Configuration file write error');
      });

      await expect(
        remoteCommand({ remove: 'error-prone-hook', parent: {} })
      ).rejects.toThrow('Configuration file write error');

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('error-prone-hook');
    });

    it('should handle file system errors during removal', async () => {
      mockRemoveRemoteHook.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      await expect(
        remoteCommand({ remove: 'permission-denied-hook', parent: { json: true } })
      ).rejects.toThrow('EACCES: permission denied');
    });

    it('should handle very long package names during removal', async () => {
      const longPackageName = '@very-long-organization-name/extremely-descriptive-hook-package-name-that-should-be-removed';

      await remoteCommand({ remove: longPackageName, parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith(longPackageName);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Removed remote hook: ${longPackageName}`)
      );
    });

    it('should handle special characters in package names during removal', async () => {
      const specialPackageName = '@my-org/hook_package-2.0-beta';

      await remoteCommand({ remove: specialPackageName, parent: { json: true } });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith(specialPackageName);
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: specialPackageName,
        })
      );
    });
  });

  describe('removal patterns', () => {
    it('should handle removing hooks with version numbers', async () => {
      await remoteCommand({ remove: 'versioned-hook@1.2.3', parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('versioned-hook@1.2.3');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed remote hook: versioned-hook@1.2.3')
      );
    });

    it('should handle removing hooks with git references', async () => {
      const gitRef = 'git+https://github.com/user/hook-repo.git';
      
      await remoteCommand({ remove: gitRef, parent: { json: true } });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith(gitRef);
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: gitRef,
        })
      );
    });

    it('should handle removing hooks with file paths', async () => {
      const filePath = 'file:../local-hook-package';
      
      await remoteCommand({ remove: filePath, parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith(filePath);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Removed remote hook: ${filePath}`)
      );
    });
  });

  describe('multiple removals', () => {
    it('should handle removing the same hook multiple times', async () => {
      await remoteCommand({ remove: 'double-remove-hook', parent: {} });
      await remoteCommand({ remove: 'double-remove-hook', parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('double-remove-hook');
      expect(mockRemoveRemoteHook).toHaveBeenCalledTimes(2);
      // The actual deduplication/no-op behavior should happen in removeRemoteHook implementation
    });

    it('should handle sequential removals in JSON mode', async () => {
      await remoteCommand({ remove: 'first-hook', parent: { json: true } });
      await remoteCommand({ remove: 'second-hook', parent: { json: true } });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('first-hook');
      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('second-hook');
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: 'first-hook',
        })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: 'second-hook',
        })
      );
    });
  });

  describe('chalk formatting', () => {
    it('should use green color for success messages', async () => {
      await remoteCommand({ remove: 'colored-removal-hook', parent: {} });

      // We can't easily test chalk colors, but we can verify the message content
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Removed remote hook: colored-removal-hook')
      );
    });
  });

  describe('idempotent removal behavior', () => {
    it('should succeed when removing non-existent hooks', async () => {
      // removeRemoteHook should handle non-existent hooks gracefully
      mockRemoveRemoteHook.mockImplementation(() => {
        // Simulate successful no-op removal
      });

      await remoteCommand({ remove: 'never-existed-hook', parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('never-existed-hook');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed remote hook: never-existed-hook')
      );
    });

    it('should return consistent JSON for non-existent hook removal', async () => {
      await remoteCommand({ remove: 'non-existent-json-hook', parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: 'non-existent-json-hook',
        })
      );
    });
  });

  describe('configuration file edge cases', () => {
    it('should handle removal when config file is missing', async () => {
      mockRemoveRemoteHook.mockImplementation(() => {
        // Simulate the case where .claude-good-hooks.json doesn't exist
        // removeRemoteHook should handle this gracefully
      });

      await remoteCommand({ remove: 'hook-no-config', parent: {} });

      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('hook-no-config');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed remote hook: hook-no-config')
      );
    });

    it('should handle removal when config file is malformed', async () => {
      mockRemoveRemoteHook.mockImplementation(() => {
        throw new Error('Unexpected token in JSON');
      });

      await expect(
        remoteCommand({ remove: 'malformed-config-hook', parent: {} })
      ).rejects.toThrow('Unexpected token in JSON');
    });
  });
});