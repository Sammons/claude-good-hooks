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

describe('doctorCommand - successful system checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks for path operations
    mockHomedir.mockReturnValue('/Users/testuser');
    mockJoin.mockImplementation((base: string, ...paths: string[]) => {
      return [base, ...paths].join('/');
    });
  });

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