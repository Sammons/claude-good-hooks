import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

// Mock process.argv and cwd
const originalArgv = process.argv;
const originalCwd = process.cwd;
const processCwdSpy = vi.spyOn(process, 'cwd');

describe('updateCommand - Local Installation & Fallback Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock basic path operations - keep it simple
    mockResolve.mockImplementation((...paths) => {
      if (paths.length === 1) return paths[0];
      return paths.join('/');
    });
    mockDirname.mockImplementation(path => path.split('/').slice(0, -1).join('/'));
    
    // Mock process.cwd to return a consistent project directory
    processCwdSpy.mockReturnValue('/Users/dev/my-project');
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.cwd = originalCwd;
  });

  describe('local installation detection via current directory', () => {
    it('should detect local installation from project package.json in current directory', async () => {
      // Using a path that won't trigger global detection or node_modules detection
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      // Mock npm prefix -g to fail to avoid global detection
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated to version 1.1.0' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') {
          return JSON.stringify({
            dependencies: {
              '@sammons/claude-good-hooks': '^1.0.0'
            }
          });
        }
        return '';
      });

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.objectContaining({ encoding: 'utf-8', stdio: 'inherit' })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation (found in /Users/dev/my-project/package.json)')
      );
    });

    it('should detect local installation from devDependencies', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated successfully' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') {
          return JSON.stringify({
            devDependencies: {
              '@sammons/claude-good-hooks': '^1.0.0'
            }
          });
        }
        return '';
      });

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation (found in /Users/dev/my-project/package.json)')
      );
    });

    it('should return JSON output for successful local update', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated successfully' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') {
          return JSON.stringify({
            dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
          });
        }
        return '';
      });

      await updateCommand({ parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          message: 'Successfully updated to latest version',
          installationType: 'local',
          installPath: '/some/other/path/claude-good-hooks',
          updateCommand: 'npm install @sammons/claude-good-hooks@latest',
          output: 'Updated successfully'
        })
      );
    });

    it('should handle local installation error scenarios', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        if (command.includes('npm install @sammons/claude-good-hooks@latest')) {
          throw new Error('EACCES: permission denied');
        }
        return '' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') {
          return JSON.stringify({
            dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
          });
        }
        return '';
      });

      await updateCommand({ parent: {} });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied. Check file permissions in your project directory')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('development environment detection', () => {
    it('should detect development environment and refuse to update', async () => {
      process.argv = ['node', '/Users/dev/claude-good-hooks/packages/cli/src/index.ts'];

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot update: running from development environment')
      );
      expect(mockExecSync).not.toHaveBeenCalledWith(
        expect.stringContaining('npm install'),
        expect.any(Object)
      );
    });

    it('should return JSON error for development environment', async () => {
      process.argv = ['node', '/Users/dev/claude-good-hooks/src/commands/update.ts'];

      await updateCommand({ parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: 'Cannot update: running from development environment. Use "npm run build" to rebuild.',
          installationType: 'development',
          installPath: '/Users/dev/claude-good-hooks/src/commands/update.ts'
        })
      );
    });

    it('should detect TypeScript files as development environment', async () => {
      process.argv = ['node', '/path/to/project/dist/index.ts'];

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot update: running from development environment')
      );
    });
  });

  describe('fallback behavior to global installation', () => {
    it('should fallback to global when package.json has parsing errors', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated successfully' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') {
          throw new Error('JSON parse error');
        }
        return '';
      });

      await updateCommand({ parent: {} });

      // Should fallback to global installation since Method 4 failed
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('global installation (fallback default)')
      );
    });

    it('should fallback to global when no local dependency found', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated successfully' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') {
          return JSON.stringify({
            dependencies: {
              'some-other-package': '^1.0.0'
            }
          });
        }
        return '';
      });

      await updateCommand({ parent: {} });

      // Should fallback to global installation since our package is not in dependencies
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('global installation (fallback default)')
      );
    });

    it('should fallback when no package.json files exist', async () => {
      process.argv = ['node', '/unusual/path/somewhere/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated successfully' as any;
      });
      // No package.json files found anywhere
      mockExistsSync.mockReturnValue(false);

      await updateCommand({ parent: {} });

      // Should fallback to global installation
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('global installation (fallback default)')
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });

    it('should provide proper error messaging for fallback scenarios', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        if (command.includes('npm install -g')) {
          throw new Error('Permission denied');
        }
        return 'Updated successfully' as any;
      });
      mockExistsSync.mockReturnValue(false);

      await updateCommand({ parent: {} });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update: Permission denied')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('If you prefer local installation, run: npm install @sammons/claude-good-hooks')
      );
    });
  });

  describe('monorepo and nested scenarios', () => {
    it('should handle monorepo workspace with different cwd', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      // Mock different cwd for monorepo scenario
      processCwdSpy.mockReturnValue('/Users/dev/monorepo/packages/app');
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated in workspace' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/monorepo/packages/app/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/monorepo/packages/app/package.json') {
          return JSON.stringify({
            dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
          });
        }
        return '';
      });

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation (found in /Users/dev/monorepo/packages/app/package.json)')
      );
    });

    it('should handle symlinked dependencies properly', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated symlinked dependency' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') {
          return JSON.stringify({
            dependencies: { '@sammons/claude-good-hooks': 'file:../local-development' }
          });
        }
        return '';
      });

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });
  });

  describe('stdio configuration for different modes', () => {
    it('should use inherit stdio for normal mode', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated successfully' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') {
          return JSON.stringify({
            dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
          });
        }
        return '';
      });

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.objectContaining({
          encoding: 'utf-8',
          stdio: 'inherit'
        })
      );
    });

    it('should use pipe stdio for JSON mode', async () => {
      process.argv = ['node', '/some/other/path/claude-good-hooks'];
      
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated successfully' as any;
      });
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') {
          return JSON.stringify({
            dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
          });
        }
        return '';
      });

      await updateCommand({ parent: { json: true } });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.objectContaining({
          encoding: 'utf-8',
          stdio: 'pipe'
        })
      );
    });
  });
});