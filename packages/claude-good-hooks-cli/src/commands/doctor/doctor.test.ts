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
    
    // Mock successful execSync calls by default
    mockExecSync.mockReturnValue('success' as any);
    mockExistsSync.mockReturnValue(true);
    
    // Mock process.version
    Object.defineProperty(process, 'version', {
      value: 'v20.0.0',
      writable: true,
    });
  });

  describe('successful system checks', () => {
    it('should report all checks passing when system is properly configured', async () => {
      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('System Check:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All checks passed!'));
    });

    it('should return JSON output when json flag is set', async () => {
      await doctorCommand({ parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const jsonOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      
      expect(jsonOutput).toHaveProperty('checks');
      expect(Array.isArray(jsonOutput.checks)).toBe(true);
      
      const pathCheck = jsonOutput.checks.find((check: any) => check.name === 'claude-good-hooks in PATH');
      expect(pathCheck.status).toBe(true);
      
      const nodeCheck = jsonOutput.checks.find((check: any) => check.name === 'Node.js version');
      expect(nodeCheck.status).toBe(true);
      expect(nodeCheck.message).toBe('v20.0.0');
    });
  });

  describe('failing system checks', () => {
    it('should detect missing claude-good-hooks in PATH', async () => {
      mockExecSync.mockImplementation((command) => {
        if (command === 'which claude-good-hooks') {
          throw new Error('Command not found');
        }
        return '' as any;
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ claude-good-hooks in PATH'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('npm install -g @sammons/claude-good-hooks')
      );
    });

    it('should detect outdated Node.js version', async () => {
      // Mock Node.js version to be older
      Object.defineProperty(process, 'version', {
        value: 'v18.0.0',
        writable: true,
      });

      await doctorCommand({ parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Node.js version'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('requires Node.js 20+'));
    });
  });

  describe('JSON output format', () => {
    it('should provide detailed JSON output for all checks', async () => {
      // Mock Node.js version to be older for testing
      Object.defineProperty(process, 'version', {
        value: 'v18.0.0',
        writable: true,
      });

      await doctorCommand({ parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const jsonOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
      
      expect(jsonOutput).toHaveProperty('checks');
      expect(Array.isArray(jsonOutput.checks)).toBe(true);
      
      const nodeCheck = jsonOutput.checks.find((check: any) => check.name === 'Node.js version');
      expect(nodeCheck.status).toBe(false);
      expect(nodeCheck.message).toBe('v18.0.0 (requires Node.js 20+)');
    });
  });
});
