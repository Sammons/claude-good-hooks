import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DoctorCommand } from './doctor.js';
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
    
    // Mock successful execSync calls by default
    mockExecSync.mockReturnValue('success' as any);
    mockExistsSync.mockReturnValue(true);
    
    // Mock process.version
    Object.defineProperty(process, 'version', {
      value: 'v20.0.0',
      writable: true,
    });
  });

  it('should display successful checks', async () => {
    const command = new DoctorCommand();
    await command.execute([], { parent: {} });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('System Check:'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All checks passed!'));
  });

  it('should return JSON output when json flag is set', async () => {
    const command = new DoctorCommand();
    await command.execute([], { parent: { json: true } });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const jsonOutput = JSON.parse(consoleSpy.mock.calls[0]?.[0] || '{}');
    
    expect(jsonOutput).toHaveProperty('checks');
    expect(Array.isArray(jsonOutput.checks)).toBe(true);
    
    const pathCheck = jsonOutput.checks.find((check: any) => check.name === 'claude-good-hooks in PATH');
    expect(pathCheck.status).toBe(true);
    
    const nodeCheck = jsonOutput.checks.find((check: any) => check.name === 'Node.js version');
    expect(nodeCheck.status).toBe(true);
    expect(nodeCheck.message).toBe('v20.0.0');
  });
});
