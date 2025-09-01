import { describe, it, expect, beforeEach, vi } from 'vitest';
import { doctorCommand } from './doctor.js';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Mock dependencies
vi.mock('child_process');
vi.mock('fs');
vi.mock('path');
vi.mock('os');

const mockExecSync = vi.mocked(execSync);
const mockExistsSync = vi.mocked(existsSync);
const mockJoin = vi.mocked(join);
const mockHomedir = vi.mocked(homedir);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('doctorCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks for path operations
    mockHomedir.mockReturnValue('/Users/testuser');
    mockJoin.mockImplementation((base: string, ...paths: string[]) => {
      return [base, ...paths].join('/');
    });
  });

  describe('successful system checks', () => {
    it('should report all checks passing when system is properly configured', async () => {
      // Mock all checks to pass
      mockExecSync
        .mockReturnValueOnce('claude-good-hooks' as any) // which claude-good-hooks
        .mockReturnValueOnce('6.0.0' as any) // npm --version
        .mockReturnValueOnce('/usr/local/lib/node_modules' as any); // npm root -g

      mockExistsSync
        .mockReturnValueOnce(true) // .claude directory
        .mockReturnValueOnce(true) // global settings.json
        .mockReturnValueOnce(true); // project settings.json

      // Mock Node.js version
      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('System Check:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ claude-good-hooks in PATH'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Node.js version'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Claude settings directory'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Global settings file'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Project settings'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ npm available'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All checks passed!'));
    });

    it('should return JSON output when json flag is set', async () => {
      mockExecSync
        .mockReturnValueOnce('claude-good-hooks' as any)
        .mockReturnValueOnce('6.0.0' as any);
      mockExistsSync.mockReturnValue(true);

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify({
          checks: expect.arrayContaining([
            expect.objectContaining({
              name: 'claude-good-hooks in PATH',
              status: true,
            }),
            expect.objectContaining({
              name: 'Node.js version',
              status: true,
              message: 'v20.0.0',
            }),
          ])
        }, null, 2))
      );
    });
  });

  describe('failing system checks', () => {
    it('should detect missing claude-good-hooks in PATH', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command === 'which claude-good-hooks') {
          throw new Error('Command not found');
        }
        return '6.0.0' as any;
      });
      mockExistsSync.mockReturnValue(true);

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ claude-good-hooks in PATH'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('npm install -g @sammons/claude-good-hooks')
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Some checks failed'));
    });

    it('should detect outdated Node.js version', async () => {
      mockExecSync.mockReturnValue('6.0.0' as any);
      mockExistsSync.mockReturnValue(true);

      Object.defineProperty(process, 'version', {
        value: 'v18.15.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Node.js version'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('v18.15.0 (requires Node.js 20+)'));
    });

    it('should detect missing Claude settings directory', async () => {
      mockExecSync.mockReturnValue('6.0.0' as any);
      mockExistsSync.mockImplementation((path) => {
        if (path.includes('.claude')) {
          return false;
        }
        return true;
      });

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Claude settings directory'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Claude Code may not be installed'));
    });

    it('should detect missing npm', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command === 'npm --version') {
          throw new Error('npm not found');
        }
        return 'claude-good-hooks' as any;
      });
      mockExistsSync.mockReturnValue(true);

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ npm available'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('npm not found. Please install Node.js/npm'));
    });
  });

  describe('settings file checks', () => {
    it('should handle missing global settings file gracefully', async () => {
      mockExecSync.mockReturnValue('6.0.0' as any);
      mockExistsSync.mockImplementation((path) => {
        if (path.includes('settings.json') && path.includes('.claude')) {
          return false; // Global settings doesn't exist
        }
        return true;
      });

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Global settings file'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Not found (will be created when needed)'));
    });

    it('should handle missing project settings file gracefully', async () => {
      mockExecSync.mockReturnValue('6.0.0' as any);
      mockExistsSync.mockImplementation((path) => {
        if (path.includes(process.cwd()) && path.includes('settings.json')) {
          return false; // Project settings doesn't exist
        }
        return true;
      });

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Project settings'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Not found (will be created when needed)'));
    });

    it('should detect existing settings files', async () => {
      mockExecSync.mockReturnValue('6.0.0' as any);
      mockExistsSync.mockReturnValue(true);

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Global settings file'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Project settings'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found'));
    });
  });

  describe('JSON output format', () => {
    it('should provide detailed JSON output for all checks', async () => {
      mockExecSync
        .mockReturnValueOnce('claude-good-hooks' as any)
        .mockReturnValueOnce('6.0.0' as any);
      mockExistsSync.mockReturnValue(false); // All files missing

      Object.defineProperty(process, 'version', {
        value: 'v18.0.0',
        writable: true,
      });

      await doctorCommand({ parent: { json: true } });

      const jsonOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(jsonOutput.checks).toHaveLength(6);
      
      const nodeCheck = jsonOutput.checks.find((check: any) => check.name === 'Node.js version');
      expect(nodeCheck.status).toBe(false);
      expect(nodeCheck.message).toBe('v18.0.0 (requires Node.js 20+)');
      
      const claudeDirCheck = jsonOutput.checks.find((check: any) => check.name === 'Claude settings directory');
      expect(claudeDirCheck.status).toBe(false);
      expect(claudeDirCheck.message).toBe('Claude Code may not be installed');
    });

    it('should handle mixed success and failure states in JSON', async () => {
      mockExecSync
        .mockReturnValueOnce('claude-good-hooks' as any) // PATH check passes
        .mockImplementation((command) => {
          if (command === 'npm --version') {
            throw new Error('npm not found');
          }
          return '' as any;
        });
      mockExistsSync.mockReturnValue(true);

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: { json: true } });

      const jsonOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      const pathCheck = jsonOutput.checks.find((check: any) => check.name === 'claude-good-hooks in PATH');
      const npmCheck = jsonOutput.checks.find((check: any) => check.name === 'npm available');
      
      expect(pathCheck.status).toBe(true);
      expect(npmCheck.status).toBe(false);
      expect(npmCheck.message).toBe('npm not found. Please install Node.js/npm');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle execSync errors gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Unexpected system error');
      });
      mockExistsSync.mockReturnValue(true);

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ claude-good-hooks in PATH'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ npm available'));
    });

    it('should handle file system errors gracefully', async () => {
      mockExecSync.mockReturnValue('6.0.0' as any);
      mockExistsSync.mockImplementation(() => {
        throw new Error('File system access denied');
      });

      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      // Should still complete the checks it can
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ claude-good-hooks in PATH'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Node.js version'));
    });

    it('should handle various Node.js version formats', async () => {
      mockExecSync.mockReturnValue('6.0.0' as any);
      mockExistsSync.mockReturnValue(true);

      const testVersions = [
        { version: 'v22.1.0', shouldPass: true },
        { version: 'v20.0.0', shouldPass: true },
        { version: 'v19.9.0', shouldPass: false },
        { version: 'v16.20.2', shouldPass: false },
      ];

      for (const { version, shouldPass } of testVersions) {
        vi.clearAllMocks();
        Object.defineProperty(process, 'version', {
          value: version,
          writable: true,
        });

        await doctorCommand({ parent: { json: true } });

        const jsonOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
        const nodeCheck = jsonOutput.checks.find((check: any) => check.name === 'Node.js version');
        
        expect(nodeCheck.status).toBe(shouldPass);
        expect(nodeCheck.message).toContain(version);
      }
    });
  });

  describe('path construction', () => {
    it('should construct correct paths for settings files', async () => {
      mockExecSync.mockReturnValue('6.0.0' as any);
      mockExistsSync.mockReturnValue(true);
      mockHomedir.mockReturnValue('/home/user');
      
      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(mockJoin).toHaveBeenCalledWith('/home/user', '.claude');
      expect(mockJoin).toHaveBeenCalledWith('/home/user', '.claude', 'settings.json');
      expect(mockJoin).toHaveBeenCalledWith(process.cwd(), '.claude');
      expect(mockJoin).toHaveBeenCalledWith(expect.stringContaining('.claude'), 'settings.json');
    });

    it('should handle different home directory paths', async () => {
      mockExecSync.mockReturnValue('6.0.0' as any);
      mockExistsSync.mockReturnValue(true);
      
      const testPaths = [
        '/Users/macuser',
        '/home/linuxuser',
        'C:\\Users\\windowsuser',
      ];

      for (const homePath of testPaths) {
        vi.clearAllMocks();
        mockHomedir.mockReturnValue(homePath);
        
        Object.defineProperty(process, 'version', {
          value: 'v20.0.0',
          writable: true,
        });

        await doctorCommand({ parent: {} });

        expect(mockJoin).toHaveBeenCalledWith(homePath, '.claude');
      }
    });
  });

  describe('comprehensive system validation', () => {
    it('should validate complete development environment setup', async () => {
      // Simulate a perfectly configured development environment
      mockExecSync
        .mockReturnValueOnce('claude-good-hooks' as any)
        .mockReturnValueOnce('8.19.0' as any);
      mockExistsSync.mockReturnValue(true);
      mockHomedir.mockReturnValue('/Users/developer');

      Object.defineProperty(process, 'version', {
        value: 'v20.10.0',
        writable: true,
      });

      await doctorCommand({ parent: { json: true } });

      const jsonOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(jsonOutput.checks).toHaveLength(6);
      expect(jsonOutput.checks.every((check: any) => check.status === true)).toBe(true);
    });

    it('should provide actionable error messages for common issues', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command === 'which claude-good-hooks') {
          throw new Error('not found');
        }
        if (command === 'npm --version') {
          throw new Error('not found');
        }
        return '' as any;
      });
      mockExistsSync.mockReturnValue(false);

      Object.defineProperty(process, 'version', {
        value: 'v16.20.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Install globally with: npm install -g @sammons/claude-good-hooks')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('v16.20.0 (requires Node.js 20+)')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please install Node.js/npm')
      );
    });
  });
});