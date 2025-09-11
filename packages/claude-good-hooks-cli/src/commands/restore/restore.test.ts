import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RestoreCommand } from './restore.js';
import { FileSystemService } from '../../services/file-system.service.js';
import { ProcessService } from '../../services/process.service.js';

// Mock fs operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

// Mock the import command
const mockExecute = vi.fn();
vi.mock('../import/import.js', () => ({
  ImportCommand: vi.fn(() => ({
    execute: mockExecute,
  })),
}));

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    blue: Object.assign((str: string) => str, { bold: (str: string) => str }),
    green: (str: string) => str,
    red: (str: string) => str,
    yellow: (str: string) => str,
    gray: (str: string) => str,
    bold: (str: string) => str,
    dim: (str: string) => str,
  },
}));

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
};

describe('RestoreCommand', () => {
  let restoreCommand: RestoreCommand;

  beforeEach(() => {
    const mockFileSystemService = {} as FileSystemService;
    const mockProcessService = {
      exit: vi.fn(),
    } as unknown as ProcessService;
    restoreCommand = new RestoreCommand(mockFileSystemService, mockProcessService);

    // Reset all mocks
    vi.clearAllMocks();
    mockExecute.mockClear();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log);
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('match', () => {
    it('should match "restore" command', () => {
      expect(restoreCommand.match('restore')).toBe(true);
    });

    it('should not match other commands', () => {
      expect(restoreCommand.match('import')).toBe(false);
      expect(restoreCommand.match('export')).toBe(false);
      expect(restoreCommand.match('apply')).toBe(false);
    });
  });

  describe('validate', () => {
    it('should require filename when not using --latest', () => {
      const result = restoreCommand.validate([], {});
      expect(result).toEqual({
        valid: false,
        errors: ['Backup filename is required (or use --latest to restore most recent backup)'],
      });
    });

    it('should not allow filename with --latest flag', () => {
      const result = restoreCommand.validate(['some-file'], { latest: true });
      expect(result).toEqual({
        valid: false,
        errors: ['Cannot specify filename when using --latest flag'],
      });
    });

    it('should validate scope parameter', () => {
      const result = restoreCommand.validate(['backup.json'], { scope: 'invalid' });
      expect(result).toEqual({
        valid: false,
        errors: ['scope: Invalid option: expected one of "project"|"global"|"local"'],
      });
    });

    it('should accept valid scope values', () => {
      expect(restoreCommand.validate(['backup.backup.json'], { scope: 'project' })).toEqual({
        valid: true,
        result: { scope: 'project' },
      });
      expect(restoreCommand.validate(['backup.backup.json'], { scope: 'global' })).toEqual({
        valid: true,
        result: { scope: 'global' },
      });
      expect(restoreCommand.validate(['backup.backup.json'], { scope: 'local' })).toEqual({
        valid: true,
        result: { scope: 'local' },
      });
    });

    it('should accept --latest without filename', () => {
      expect(restoreCommand.validate([], { latest: true })).toEqual({
        valid: true,
        result: { latest: true },
      });
    });

    it('should accept valid filename', () => {
      expect(restoreCommand.validate(['backup.backup.json'], {})).toEqual({
        valid: true,
        result: {},
      });
    });

    it('should allow help flag without validation', () => {
      expect(restoreCommand.validate([], { help: true })).toEqual({
        valid: true,
        result: { help: true },
      });
    });
  });

  describe('getHelp', () => {
    it('should return correct help information', () => {
      const help = restoreCommand.getHelp();

      expect(help.name).toBe('restore');
      expect(help.description).toBe('Restore Claude hooks configuration from backup files');
      expect(help.usage).toBe('claude-good-hooks restore [options] [<backup-file>]');

      // Check for key options
      const latestOption = help.options?.find(opt => opt.name === 'latest');
      expect(latestOption).toBeDefined();
      expect(latestOption?.description).toContain('most recent backup');

      const scopeOption = help.options?.find(opt => opt.name === 'scope');
      expect(scopeOption).toBeDefined();
      expect(scopeOption?.type).toBe('string');

      // Check examples
      expect(help.examples).toContain('claude-good-hooks restore --latest');
      expect(help.examples?.some(ex => ex.includes('settings.json.backup.'))).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock process.exit to prevent test termination
      vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    it('should display help when help flag is set', async () => {
      await restoreCommand.execute([], { help: true });

      expect(mockConsole.log).toHaveBeenCalled();
      // Should show help text in the new format
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Restore Command'));
    });

    it('should display help in JSON format when parent.json is true', async () => {
      await restoreCommand.execute([], { help: true, parent: { json: true } });

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/\{[\s\S]*"name":\s*"restore"[\s\S]*\}/)
      );
    });

    it('should exit with error when backup file validation fails', async () => {
      // This validation now happens in the validate method, not execute
      const result = restoreCommand.validate(['invalid-name'], {});
      expect(result).toEqual({
        valid: false,
        errors: ['File does not appear to be a backup file (must contain ".backup.")'],
      });
    });

    it('should require backup filename when not using --latest', () => {
      // This validation now happens in the validate method, not execute
      const result = restoreCommand.validate([], {});
      expect(result).toEqual({
        valid: false,
        errors: ['Backup filename is required (or use --latest to restore most recent backup)'],
      });
    });
  });

  // Note: findLatestBackup, findBackupFile, and getSearchPaths methods
  // are now private in the sub-commands and don't need to be tested here.
  // They are tested implicitly through the execute method integration tests.
});
