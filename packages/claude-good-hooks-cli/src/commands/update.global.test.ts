import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateCommand } from './update.js';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';

// Mock dependencies
vi.mock('child_process');
vi.mock('path');
vi.mock('fs');

const mockExecSync = vi.mocked(execSync);
const mockResolve = vi.mocked(resolve);
const mockDirname = vi.mocked(dirname);
const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

// Mock process.argv
const originalArgv = process.argv;

describe('updateCommand - Global Installation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock basic path operations
    mockResolve.mockImplementation((...paths) => paths.join('/'));
    mockDirname.mockImplementation(path => path.split('/').slice(0, -1).join('/'));
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  describe('global installation detection', () => {
    it('should detect global installation from npm prefix', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any) // npm prefix -g
        .mockReturnValueOnce('Updated to version 1.1.0' as any); // npm install command

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith('npm prefix -g', { encoding: 'utf-8' });
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.objectContaining({ encoding: 'utf-8', stdio: 'inherit' })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Detected global installation')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated to latest version (global)')
      );
    });

    it('should detect global installation from path patterns', async () => {
      process.argv = ['/usr/local/bin/claude-good-hooks'];
      
      mockResolve.mockReturnValue('/usr/local/bin/claude-good-hooks');
      mockExecSync
        .mockReturnValueOnce(new Error('npm prefix failed') as any) // npm prefix -g fails
        .mockReturnValueOnce('Updated successfully' as any); // update command

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });

    it('should detect global installation from environment variables', async () => {
      process.argv = ['/some/path/claude-good-hooks'];
      process.env.npm_config_global = 'true';
      
      mockResolve.mockReturnValue('/some/path/claude-good-hooks');
      mockExecSync
        .mockReturnValueOnce(new Error('npm prefix failed') as any)
        .mockReturnValueOnce('Updated successfully' as any);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('global installation (detected via environment)')
      );
      
      delete process.env.npm_config_global;
    });

    it('should fallback to global installation when detection is uncertain', async () => {
      process.argv = ['/unknown/path/claude-good-hooks'];
      
      mockResolve.mockReturnValue('/unknown/path/claude-good-hooks');
      mockExecSync
        .mockReturnValueOnce(new Error('npm prefix failed') as any)
        .mockReturnValueOnce('Updated successfully' as any);
      mockExistsSync.mockReturnValue(false);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('global installation (fallback default)')
      );
    });
  });

  describe('successful global updates', () => {
    it('should successfully update global installation', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockReturnValueOnce('+ @sammons/claude-good-hooks@1.2.0\nadded 1 package' as any);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating @sammons/claude-good-hooks...')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated to latest version (global)')
      );
    });

    it('should return JSON output for successful global update', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockReturnValueOnce('Updated successfully' as any);

      await updateCommand({ parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          message: 'Successfully updated to latest version',
          installationType: 'global',
          installPath: '/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs',
          updateCommand: 'npm install -g @sammons/claude-good-hooks@latest',
          output: 'Updated successfully'
        })
      );
    });

    it('should handle complex global installation paths', async () => {
      const complexPath = '/opt/homebrew/lib/node_modules/@sammons/claude-good-hooks/bin/cli.js';
      process.argv = [complexPath];
      
      mockResolve.mockReturnValue(complexPath);
      mockExecSync
        .mockReturnValueOnce('/opt/homebrew' as any)
        .mockReturnValueOnce('Installation successful' as any);

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated to latest version (global)')
      );
    });
  });

  describe('global update error scenarios', () => {
    it('should handle permission errors for global installation', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockImplementation((command) => {
          if (command.includes('npm install -g')) {
            const error = new Error('EACCES: permission denied');
            throw error;
          }
          return '' as any;
        });

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied for global installation')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle network errors during global update', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockImplementation((command) => {
          if (command.includes('npm install -g')) {
            throw new Error('ENOTFOUND registry.npmjs.org');
          }
          return '' as any;
        });

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network error. Check your internet connection')
      );
    });

    it('should handle 404 errors for global package', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockImplementation((command) => {
          if (command.includes('npm install -g')) {
            throw new Error('404 Not Found');
          }
          return '' as any;
        });

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('The package may not be published to npm yet')
      );
    });

    it('should return JSON error output for global update failures', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockImplementation((command) => {
          if (command.includes('npm install -g')) {
            throw new Error('Update failed');
          }
          return '' as any;
        });

      await updateCommand({ parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: 'Failed to update: Update failed',
          installationType: 'global',
          installPath: '/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs',
          updateCommand: 'npm install -g @sammons/claude-good-hooks@latest'
        })
      );
    });
  });

  describe('global installation detection edge cases', () => {
    it('should handle Windows global paths', async () => {
      const windowsPath = 'C:\\Users\\user\\AppData\\Roaming\\npm\\node_modules\\@sammons\\claude-good-hooks\\bin\\cli.js';
      process.argv = [windowsPath];
      
      mockResolve.mockReturnValue(windowsPath);
      mockExecSync
        .mockReturnValueOnce('C:\\Program Files\\nodejs' as any)
        .mockReturnValueOnce('Updated successfully' as any);

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });

    it('should handle npm prefix command failures gracefully', async () => {
      process.argv = ['/usr/local/bin/claude-good-hooks'];
      
      mockResolve.mockReturnValue('/usr/local/bin/claude-good-hooks');
      mockExecSync
        .mockImplementation((command) => {
          if (command === 'npm prefix -g') {
            throw new Error('npm command failed');
          }
          return 'Updated successfully' as any;
        });

      await updateCommand({ parent: {} });

      // Should still attempt global update as fallback
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });

    it('should detect global installation from node_modules path patterns', async () => {
      process.argv = ['/custom/location/node_modules/@sammons/claude-good-hooks/bin/cli.js'];
      
      mockResolve.mockReturnValue('/custom/location/node_modules/@sammons/claude-good-hooks/bin/cli.js');
      mockExecSync
        .mockReturnValueOnce(new Error('npm prefix failed') as any)
        .mockReturnValueOnce('Updated successfully' as any);
      mockExistsSync.mockReturnValue(false); // No package.json in parent

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('global installation (fallback default)')
      );
    });
  });

  describe('global vs local precedence', () => {
    it('should prefer detected global installation over fallback', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockReturnValueOnce('Updated successfully' as any);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Detected global installation')
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });

    it('should provide alternative installation suggestion for global failures', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockImplementation((command) => {
          if (command.includes('npm install -g')) {
            throw new Error('Permission denied');
          }
          return '' as any;
        });

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('If you prefer local installation, run: npm install @sammons/claude-good-hooks')
      );
    });
  });

  describe('update command validation', () => {
    it('should use correct npm command for global updates', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockReturnValueOnce('Updated successfully' as any);

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.objectContaining({
          encoding: 'utf-8',
          stdio: 'inherit'
        })
      );
    });

    it('should use pipe stdio for JSON mode', async () => {
      process.argv = ['/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/usr/local/lib/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExecSync
        .mockReturnValueOnce('/usr/local' as any)
        .mockReturnValueOnce('Updated successfully' as any);

      await updateCommand({ parent: { json: true } });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.objectContaining({
          encoding: 'utf-8',
          stdio: 'pipe'
        })
      );
    });
  });

  describe('complex global installation scenarios', () => {
    it('should handle multiple detection methods failing', async () => {
      process.argv = ['/unusual/path/claude-good-hooks'];
      
      mockResolve.mockReturnValue('/unusual/path/claude-good-hooks');
      mockExecSync
        .mockReturnValueOnce(new Error('npm prefix failed') as any)
        .mockReturnValueOnce('Updated successfully' as any);
      mockExistsSync.mockReturnValue(false);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('global installation (fallback default)')
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });

    it('should handle global installation with npm environment config', async () => {
      process.argv = ['/some/path/claude-good-hooks'];
      process.env.NPM_CONFIG_PREFIX = '/opt/custom-npm';
      
      mockResolve.mockReturnValue('/some/path/claude-good-hooks');
      mockExecSync
        .mockReturnValueOnce(new Error('npm prefix failed') as any)
        .mockReturnValueOnce('Updated successfully' as any);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('global installation (detected via environment)')
      );
      
      delete process.env.NPM_CONFIG_PREFIX;
    });
  });
});