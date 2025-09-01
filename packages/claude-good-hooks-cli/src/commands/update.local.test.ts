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
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

// Mock process.argv and cwd
const originalArgv = process.argv;
const originalCwd = process.cwd;

describe('updateCommand - Local Installation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock basic path operations
    mockResolve.mockImplementation((...paths) => paths.join('/'));
    mockDirname.mockImplementation(path => path.split('/').slice(0, -1).join('/'));
    
    // Mock process.cwd to return a consistent project directory
    vi.mocked(process.cwd).mockReturnValue('/Users/dev/my-project');
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.cwd = originalCwd;
  });

  describe('local installation detection', () => {
    it('should detect local installation from project node_modules', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          '@sammons/claude-good-hooks': '^1.0.0'
        }
      }));
      mockExecSync.mockReturnValue('Updated to version 1.1.0' as any);

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.objectContaining({ encoding: 'utf-8', stdio: 'inherit' })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation (found in /Users/dev/my-project/package.json)')
      );
    });

    it('should detect local installation when in node_modules structure', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/.bin/claude-good-hooks'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/.bin/claude-good-hooks');
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/my-project/package.json') return true;
        return false;
      });
      mockExecSync.mockReturnValue('Updated successfully' as any);

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation in /Users/dev/my-project')
      );
    });

    it('should detect local installation from devDependencies', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/bin/cli.js'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/bin/cli.js');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        devDependencies: {
          '@sammons/claude-good-hooks': '^1.0.0'
        }
      }));
      mockExecSync.mockReturnValue('Updated successfully' as any);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation (found in /Users/dev/my-project/package.json)')
      );
    });

    it('should handle package.json parsing errors gracefully', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('JSON parse error');
      });
      mockExecSync.mockReturnValue('Updated successfully' as any);

      await updateCommand({ parent: {} });

      // Should fallback to detecting based on path structure
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });
  });

  describe('successful local updates', () => {
    it('should successfully update local installation', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockReturnValue('+ @sammons/claude-good-hooks@1.2.0\nupdated 1 package' as any);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Updating @sammons/claude-good-hooks...')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated to latest version (local)')
      );
    });

    it('should return JSON output for successful local update', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockReturnValue('Updated successfully' as any);

      await updateCommand({ parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          message: 'Successfully updated to latest version',
          installationType: 'local',
          installPath: '/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs',
          updateCommand: 'npm install @sammons/claude-good-hooks@latest',
          output: 'Updated successfully'
        })
      );
    });

    it('should handle monorepo workspace local updates', async () => {
      process.argv = ['/Users/dev/monorepo/packages/app/node_modules/@sammons/claude-good-hooks/bin/cli.js'];
      
      mockResolve.mockReturnValue('/Users/dev/monorepo/packages/app/node_modules/@sammons/claude-good-hooks/bin/cli.js');
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/monorepo/packages/app/package.json') return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockReturnValue('Updated in workspace' as any);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation (found in /Users/dev/monorepo/packages/app/package.json)')
      );
    });
  });

  describe('local update error scenarios', () => {
    it('should handle permission errors for local installation', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockImplementation((command) => {
        if (command.includes('npm install')) {
          throw new Error('EACCES: permission denied');
        }
        return '' as any;
      });

      await updateCommand({ parent: {} });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied. Check file permissions in your project directory')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle network errors during local update', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockImplementation((command) => {
        if (command.includes('npm install')) {
          throw new Error('ENOTFOUND registry.npmjs.org');
        }
        return '' as any;
      });

      await updateCommand({ parent: {} });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network error. Check your internet connection')
      );
    });

    it('should handle package not found errors for local update', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockImplementation((command) => {
        if (command.includes('npm install')) {
          throw new Error('404 Not Found - GET https://registry.npmjs.org/@sammons/claude-good-hooks');
        }
        return '' as any;
      });

      await updateCommand({ parent: {} });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('The package may not be published to npm yet')
      );
    });

    it('should return JSON error output for local update failures', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockImplementation((command) => {
        if (command.includes('npm install')) {
          throw new Error('Local update failed');
        }
        return '' as any;
      });

      await updateCommand({ parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: 'Failed to update: Local update failed',
          installationType: 'local',
          installPath: '/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs',
          updateCommand: 'npm install @sammons/claude-good-hooks@latest'
        })
      );
    });
  });

  describe('development environment detection', () => {
    it('should detect development environment and refuse to update', async () => {
      process.argv = ['/Users/dev/claude-good-hooks/packages/cli/src/index.ts'];
      
      mockResolve.mockReturnValue('/Users/dev/claude-good-hooks/packages/cli/src/index.ts');

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
      process.argv = ['/Users/dev/claude-good-hooks/src/commands/update.ts'];
      
      mockResolve.mockReturnValue('/Users/dev/claude-good-hooks/src/commands/update.ts');

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
      process.argv = ['/path/to/project/dist/index.ts']; // .ts extension
      
      mockResolve.mockReturnValue('/path/to/project/dist/index.ts');

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot update: running from development environment')
      );
    });
  });

  describe('local vs global precedence', () => {
    it('should prefer detected local installation over global fallback', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockReturnValue('Updated successfully' as any);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation (found in /Users/dev/my-project/package.json)')
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });

    it('should provide alternative installation suggestion for local failures', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockImplementation((command) => {
        if (command.includes('npm install')) {
          throw new Error('Permission denied');
        }
        return '' as any;
      });

      await updateCommand({ parent: {} });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('If you prefer global installation, run: npm install -g @sammons/claude-good-hooks')
      );
    });
  });

  describe('update command validation', () => {
    it('should use correct npm command for local updates', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockReturnValue('Updated successfully' as any);

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.objectContaining({
          encoding: 'utf-8',
          stdio: 'inherit'
        })
      );
    });

    it('should use pipe stdio for JSON mode in local updates', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockReturnValue('Updated successfully' as any);

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

  describe('complex local installation scenarios', () => {
    it('should handle nested project structures', async () => {
      const nestedPath = '/Users/dev/workspace/projects/frontend/node_modules/@sammons/claude-good-hooks/bin/cli.js';
      process.argv = [nestedPath];
      
      mockResolve.mockReturnValue(nestedPath);
      mockExistsSync.mockImplementation((path) => {
        if (path === '/Users/dev/workspace/projects/frontend/package.json') return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        devDependencies: { '@sammons/claude-good-hooks': '^1.0.0' }
      }));
      mockExecSync.mockReturnValue('Updated in nested project' as any);

      await updateCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation (found in /Users/dev/workspace/projects/frontend/package.json)')
      );
    });

    it('should handle symlinked node_modules', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockImplementation((path) => {
        // Simulate symlinked scenario where package.json might be found in unexpected locations
        if (path.includes('/Users/dev/my-project/package.json')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: { '@sammons/claude-good-hooks': 'file:../local-development' }
      }));
      mockExecSync.mockReturnValue('Updated symlinked dependency' as any);

      await updateCommand({ parent: {} });

      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
    });

    it('should handle package.json without the expected dependency', async () => {
      process.argv = ['/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs'];
      
      mockResolve.mockReturnValue('/Users/dev/my-project/node_modules/@sammons/claude-good-hooks/dist/index.mjs');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          'some-other-package': '^1.0.0'
        }
      }));
      mockExecSync.mockReturnValue('Updated successfully' as any);

      await updateCommand({ parent: {} });

      // Should still proceed with local update based on path structure
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install @sammons/claude-good-hooks@latest',
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('local installation in /Users/dev/my-project')
      );
    });
  });

  describe('detection fallback behavior', () => {
    it('should fallback through detection methods systematically', async () => {
      process.argv = ['/unusual/path/somewhere/claude-good-hooks'];
      
      mockResolve.mockReturnValue('/unusual/path/somewhere/claude-good-hooks');
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm prefix -g') {
          throw new Error('npm prefix failed');
        }
        return 'Updated successfully' as any;
      });
      mockExistsSync.mockReturnValue(false); // No package.json files found

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
  });
});