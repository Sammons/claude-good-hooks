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

describe('doctorCommand - failing system checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks for path operations
    mockHomedir.mockReturnValue('/Users/testuser');
    mockJoin.mockImplementation((base: string, ...paths: string[]) => {
      return [base, ...paths].join('/');
    });
  });

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