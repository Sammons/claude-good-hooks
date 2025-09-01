import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { remoteCommand } from './remote.js';
import * as modulesModule from '../utils/modules.js';

// Mock dependencies
vi.mock('../utils/modules.js');
vi.mock('chalk', () => ({
  default: {
    green: vi.fn(text => `✓ ${text}`),
    red: vi.fn(text => `✗ ${text}`),
    yellow: vi.fn(text => `⚠ ${text}`),
    bold: vi.fn(text => `**${text}**`),
  }
}));

const mockIsModuleInstalled = vi.mocked(modulesModule.isModuleInstalled);
const mockAddRemoteHook = vi.mocked(modulesModule.addRemoteHook);
const mockRemoveRemoteHook = vi.mocked(modulesModule.removeRemoteHook);
const mockGetRemoteHooks = vi.mocked(modulesModule.getRemoteHooks);

describe('Remote Command Scenarios', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Add Remote Hook Scenarios', () => {
    it('should add remote hook when module is installed locally', async () => {
      // Setup
      mockIsModuleInstalled
        .mockReturnValueOnce(true)  // local check passes
        .mockReturnValueOnce(false); // global check (not needed)
      mockAddRemoteHook.mockImplementation(() => {});

      // Execute
      await remoteCommand({ add: 'my-hook-package', parent: {} });

      // Verify
      expect(mockIsModuleInstalled).toHaveBeenCalledWith('my-hook-package', false);
      expect(mockAddRemoteHook).toHaveBeenCalledWith('my-hook-package');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Added remote hook: my-hook-package');
    });

    it('should add remote hook when module is installed globally', async () => {
      // Setup
      mockIsModuleInstalled
        .mockReturnValueOnce(false) // local check fails
        .mockReturnValueOnce(true); // global check passes
      mockAddRemoteHook.mockImplementation(() => {});

      // Execute
      await remoteCommand({ add: 'global-hook-package', parent: {} });

      // Verify
      expect(mockIsModuleInstalled).toHaveBeenCalledWith('global-hook-package', false);
      expect(mockIsModuleInstalled).toHaveBeenCalledWith('global-hook-package', true);
      expect(mockAddRemoteHook).toHaveBeenCalledWith('global-hook-package');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Added remote hook: global-hook-package');
    });

    it('should output JSON format when adding remote hook', async () => {
      // Setup
      mockIsModuleInstalled.mockReturnValue(true);
      mockAddRemoteHook.mockImplementation(() => {});

      // Execute
      await remoteCommand({ add: 'test-package', parent: { json: true } });

      // Verify JSON output
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'added',
          module: 'test-package'
        })
      );
    });

    it('should fail when module is not installed anywhere', async () => {
      // Setup
      mockIsModuleInstalled.mockReturnValue(false); // Both local and global fail

      // Execute & Verify
      await expect(async () => {
        await remoteCommand({ add: 'non-existent-package', parent: {} });
      }).rejects.toThrow('process.exit called');

      expect(mockIsModuleInstalled).toHaveBeenCalledWith('non-existent-package', false);
      expect(mockIsModuleInstalled).toHaveBeenCalledWith('non-existent-package', true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '✗ Module non-existent-package is not installed. Please install it first using:\n  npm install non-existent-package\n  or\n  npm install -g non-existent-package'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should fail with JSON output when module is not installed', async () => {
      // Setup
      mockIsModuleInstalled.mockReturnValue(false);

      // Execute & Verify
      await expect(async () => {
        await remoteCommand({ add: 'missing-package', parent: { json: true } });
      }).rejects.toThrow('process.exit called');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: 'Module missing-package is not installed. Please install it first using:\n  npm install missing-package\n  or\n  npm install -g missing-package'
        })
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle errors in addRemoteHook', async () => {
      // Setup
      mockIsModuleInstalled.mockReturnValue(true);
      mockAddRemoteHook.mockImplementation(() => {
        throw new Error('File system error');
      });

      // Execute & Verify
      await expect(async () => {
        await remoteCommand({ add: 'error-package', parent: {} });
      }).rejects.toThrow('File system error');
    });
  });

  describe('Remove Remote Hook Scenarios', () => {
    it('should remove remote hook successfully', async () => {
      // Setup
      mockRemoveRemoteHook.mockImplementation(() => {});

      // Execute
      await remoteCommand({ remove: 'old-hook-package', parent: {} });

      // Verify
      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('old-hook-package');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Removed remote hook: old-hook-package');
    });

    it('should remove remote hook with JSON output', async () => {
      // Setup
      mockRemoveRemoteHook.mockImplementation(() => {});

      // Execute
      await remoteCommand({ remove: 'test-package', parent: { json: true } });

      // Verify JSON output
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          action: 'removed',
          module: 'test-package'
        })
      );
    });

    it('should handle remove operation even if hook was not configured', async () => {
      // Setup - removeRemoteHook should handle this gracefully
      mockRemoveRemoteHook.mockImplementation(() => {}); // No error

      // Execute
      await remoteCommand({ remove: 'never-added-package', parent: {} });

      // Verify - should succeed anyway
      expect(mockRemoveRemoteHook).toHaveBeenCalledWith('never-added-package');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Removed remote hook: never-added-package');
    });

    it('should handle errors in removeRemoteHook', async () => {
      // Setup
      mockRemoveRemoteHook.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Execute & Verify
      await expect(async () => {
        await remoteCommand({ remove: 'error-package', parent: {} });
      }).rejects.toThrow('Permission denied');
    });
  });

  describe('List Remote Hooks Scenarios', () => {
    it('should display configured remote hooks with installation status', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['hook1', 'hook2', 'hook3']);
      mockIsModuleInstalled
        .mockReturnValueOnce(true)  // hook1 local
        .mockReturnValueOnce(false) // hook1 global (not needed)
        .mockReturnValueOnce(false) // hook2 local
        .mockReturnValueOnce(true)  // hook2 global
        .mockReturnValueOnce(false) // hook3 local
        .mockReturnValueOnce(false); // hook3 global

      // Execute
      await remoteCommand({ parent: {} });

      // Verify listing
      expect(mockGetRemoteHooks).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('**\nConfigured Remote Hooks:\n**');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ hook1'); // installed locally
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ hook2'); // installed globally
      expect(consoleLogSpy).toHaveBeenCalledWith('✗ hook3'); // not installed
    });

    it('should display message when no remote hooks are configured', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue([]);

      // Execute
      await remoteCommand({ parent: {} });

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith('⚠ No remote hooks configured');
    });

    it('should output JSON format when listing remote hooks', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['remote1', 'remote2']);
      mockIsModuleInstalled
        .mockReturnValue(true); // All installed

      // Execute
      await remoteCommand({ parent: { json: true } });

      // Verify JSON output
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          remotes: ['remote1', 'remote2']
        })
      );
    });

    it('should output empty JSON array when no remotes configured', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue([]);

      // Execute
      await remoteCommand({ parent: { json: true } });

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          remotes: []
        })
      );
    });

    it('should handle errors in getRemoteHooks gracefully', async () => {
      // Setup
      mockGetRemoteHooks.mockImplementation(() => {
        throw new Error('Config file corrupted');
      });

      // Execute & Verify - should propagate error
      await expect(async () => {
        await remoteCommand({ parent: {} });
      }).rejects.toThrow('Config file corrupted');
    });

    it('should handle errors in isModuleInstalled during listing', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['problem-hook']);
      mockIsModuleInstalled.mockImplementation(() => {
        throw new Error('npm registry error');
      });

      // Execute & Verify - should propagate error
      await expect(async () => {
        await remoteCommand({ parent: {} });
      }).rejects.toThrow('npm registry error');
    });
  });

  describe('Option Parsing Scenarios', () => {
    it('should prioritize explicit json option over parent json', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['test-hook']);
      mockIsModuleInstalled.mockReturnValue(true);

      // Execute - both options set
      await remoteCommand({ json: true, parent: { json: false } });

      // Verify JSON output is used
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          remotes: ['test-hook']
        })
      );
    });

    it('should use parent json when command json is not set', async () => {
      // Setup
      mockGetRemoteHooks.mockReturnValue(['test-hook']);
      mockIsModuleInstalled.mockReturnValue(true);

      // Execute
      await remoteCommand({ parent: { json: true } });

      // Verify JSON output
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({
          remotes: ['test-hook']
        })
      );
    });

    it('should handle both add and remove options (add takes precedence)', async () => {
      // Setup - both options provided (edge case)
      mockIsModuleInstalled.mockReturnValue(true);
      mockAddRemoteHook.mockImplementation(() => {});

      // Execute
      await remoteCommand({ add: 'add-package', remove: 'remove-package', parent: {} });

      // Verify - add should be executed, remove ignored
      expect(mockAddRemoteHook).toHaveBeenCalledWith('add-package');
      expect(mockRemoveRemoteHook).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Added remote hook: add-package');
    });
  });

  describe('Edge Case Scenarios', () => {
    it('should handle package names with special characters', async () => {
      // Setup
      const packageName = '@org/my-hook-package';
      mockIsModuleInstalled.mockReturnValue(true);
      mockAddRemoteHook.mockImplementation(() => {});

      // Execute
      await remoteCommand({ add: packageName, parent: {} });

      // Verify
      expect(mockIsModuleInstalled).toHaveBeenCalledWith(packageName, false);
      expect(mockAddRemoteHook).toHaveBeenCalledWith(packageName);
      expect(consoleLogSpy).toHaveBeenCalledWith(`✓ Added remote hook: ${packageName}`);
    });

    it('should handle very long package names', async () => {
      // Setup
      const longName = 'a-very-long-package-name-that-might-cause-display-issues-if-not-handled-properly';
      mockIsModuleInstalled.mockReturnValue(true);
      mockAddRemoteHook.mockImplementation(() => {});

      // Execute
      await remoteCommand({ add: longName, parent: {} });

      // Verify
      expect(consoleLogSpy).toHaveBeenCalledWith(`✓ Added remote hook: ${longName}`);
    });

    it('should handle empty string package names gracefully', async () => {
      // Setup
      mockIsModuleInstalled.mockReturnValue(false);

      // Execute & Verify
      await expect(async () => {
        await remoteCommand({ add: '', parent: {} });
      }).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Module\s+is not installed/)
      );
    });

    it('should handle concurrent add and list operations', async () => {
      // This tests the behavior when checking installation during add
      // Setup
      mockIsModuleInstalled.mockReturnValue(true);
      mockAddRemoteHook.mockImplementation(() => {});
      mockGetRemoteHooks.mockReturnValue(['existing-hook']);

      // Execute add operation
      await remoteCommand({ add: 'new-hook', parent: {} });

      // Verify add completed
      expect(mockAddRemoteHook).toHaveBeenCalledWith('new-hook');

      // Reset mocks for list operation
      vi.clearAllMocks();
      mockGetRemoteHooks.mockReturnValue(['existing-hook', 'new-hook']);
      mockIsModuleInstalled.mockReturnValue(true);

      // Execute list operation
      await remoteCommand({ parent: {} });

      // Verify list shows both hooks
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ existing-hook');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ new-hook');
    });

    it('should handle mixed installation states correctly', async () => {
      // Setup - multiple hooks with different installation states
      mockGetRemoteHooks.mockReturnValue(['local-only', 'global-only', 'both', 'neither']);
      
      // local-only: installed locally but not globally
      mockIsModuleInstalled
        .mockReturnValueOnce(true)  // local-only local
        .mockReturnValueOnce(false) // local-only global (not checked since local=true)
        .mockReturnValueOnce(false) // global-only local
        .mockReturnValueOnce(true)  // global-only global
        .mockReturnValueOnce(true)  // both local
        .mockReturnValueOnce(false) // both global (not checked since local=true)
        .mockReturnValueOnce(false) // neither local
        .mockReturnValueOnce(false); // neither global

      // Execute
      await remoteCommand({ parent: {} });

      // Verify correct display
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ local-only');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ global-only');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ both');
      expect(consoleLogSpy).toHaveBeenCalledWith('✗ neither');
    });
  });

  describe('File System Integration Scenarios', () => {
    it('should handle config file write errors during add', async () => {
      // Setup
      mockIsModuleInstalled.mockReturnValue(true);
      mockAddRemoteHook.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Execute & Verify
      await expect(async () => {
        await remoteCommand({ add: 'test-package', parent: {} });
      }).rejects.toThrow('EACCES: permission denied');
    });

    it('should handle config file read errors during list', async () => {
      // Setup
      mockGetRemoteHooks.mockImplementation(() => {
        throw new Error('ENOENT: config file not found');
      });

      // Execute & Verify
      await expect(async () => {
        await remoteCommand({ parent: {} });
      }).rejects.toThrow('ENOENT: config file not found');
    });

    it('should handle npm registry connectivity issues', async () => {
      // Setup
      mockIsModuleInstalled.mockImplementation(() => {
        throw new Error('Network timeout');
      });

      // Execute & Verify
      await expect(async () => {
        await remoteCommand({ add: 'network-package', parent: {} });
      }).rejects.toThrow('Network timeout');
    });
  });
});