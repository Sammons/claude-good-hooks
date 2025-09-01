import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsService } from './settings.service.js';
import type { IFileSystemService } from '../interfaces/index.js';
import type { ClaudeSettings } from '@sammons/claude-good-hooks-types';

// Mock file system service for testing
class MockFileSystemService implements IFileSystemService {
  private files = new Map<string, string>();
  private dirs = new Set<string>();

  exists(path: string): boolean {
    return this.files.has(path) || this.dirs.has(path);
  }

  readFile(path: string, encoding?: BufferEncoding): string {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  writeFile(path: string, data: string): void {
    this.files.set(path, data);
  }

  mkdir(path: string, options?: { recursive?: boolean }): void {
    this.dirs.add(path);
  }

  dirname(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? '.' : path.substring(0, lastSlash);
  }

  join(...paths: string[]): string {
    return paths.join('/').replace(/\/+/g, '/');
  }

  homedir(): string {
    return '/home/user';
  }

  cwd(): string {
    return '/project';
  }

  // Test helper methods
  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  clear(): void {
    this.files.clear();
    this.dirs.clear();
  }
}

describe('SettingsService', () => {
  let mockFs: MockFileSystemService;
  let settingsService: SettingsService;

  beforeEach(() => {
    mockFs = new MockFileSystemService();
    settingsService = new SettingsService(mockFs);
  });

  describe('getSettingsPath', () => {
    it('returns correct path for global scope', () => {
      const path = settingsService.getSettingsPath('global');
      expect(path).toBe('/home/user/.claude/settings.json');
    });

    it('returns correct path for project scope', () => {
      const path = settingsService.getSettingsPath('project');
      expect(path).toBe('/project/.claude/settings.json');
    });

    it('returns correct path for local scope', () => {
      const path = settingsService.getSettingsPath('local');
      expect(path).toBe('/project/.claude/settings.local.json');
    });
  });

  describe('readSettings', () => {
    it('returns empty object when file does not exist', () => {
      const settings = settingsService.readSettings('global');
      expect(settings).toEqual({});
    });

    it('parses JSON content when file exists', () => {
      const mockSettings: ClaudeSettings = {
        hooks: {
          PreToolUse: [{ matcher: 'test', hooks: [{ type: 'command', command: 'echo test' }] }]
        }
      };
      mockFs.setFile('/home/user/.claude/settings.json', JSON.stringify(mockSettings));

      const settings = settingsService.readSettings('global');
      expect(settings).toEqual(mockSettings);
    });

    it('returns empty object when JSON parsing fails', () => {
      mockFs.setFile('/home/user/.claude/settings.json', 'invalid json');
      
      const settings = settingsService.readSettings('global');
      expect(settings).toEqual({});
    });
  });

  describe('writeSettings', () => {
    it('creates directory if it does not exist', () => {
      const settings: ClaudeSettings = { hooks: {} };
      
      settingsService.writeSettings('global', settings);
      
      expect(mockFs.dirs.has('/home/user/.claude')).toBe(true);
    });

    it('writes settings as formatted JSON', () => {
      const settings: ClaudeSettings = {
        hooks: {
          PreToolUse: [{ matcher: 'test', hooks: [{ type: 'command', command: 'echo test' }] }]
        }
      };
      
      settingsService.writeSettings('global', settings);
      
      const written = mockFs.getFile('/home/user/.claude/settings.json');
      expect(written).toBe(JSON.stringify(settings, null, 2));
    });
  });

  describe('addHookToSettings', () => {
    it('creates hooks structure if it does not exist', () => {
      const hookConfig = { matcher: 'test', hooks: [{ type: 'command' as const, command: 'echo test' }] };
      
      settingsService.addHookToSettings('global', 'PreToolUse', hookConfig);
      
      const written = mockFs.getFile('/home/user/.claude/settings.json');
      const parsed = JSON.parse(written!);
      expect(parsed.hooks.PreToolUse).toHaveLength(1);
      expect(parsed.hooks.PreToolUse[0]).toEqual(hookConfig);
    });

    it('appends to existing hooks', () => {
      const existing: ClaudeSettings = {
        hooks: {
          PreToolUse: [{ matcher: 'existing', hooks: [{ type: 'command', command: 'echo existing' }] }]
        }
      };
      mockFs.setFile('/home/user/.claude/settings.json', JSON.stringify(existing));
      
      const newHook = { matcher: 'new', hooks: [{ type: 'command' as const, command: 'echo new' }] };
      settingsService.addHookToSettings('global', 'PreToolUse', newHook);
      
      const written = mockFs.getFile('/home/user/.claude/settings.json');
      const parsed = JSON.parse(written!);
      expect(parsed.hooks.PreToolUse).toHaveLength(2);
      expect(parsed.hooks.PreToolUse[1]).toEqual(newHook);
    });
  });

  describe('removeHookFromSettings', () => {
    beforeEach(() => {
      const settings: ClaudeSettings = {
        hooks: {
          PreToolUse: [
            { matcher: 'test1', hooks: [{ type: 'command', command: 'echo test1' }] },
            { matcher: 'test2', hooks: [{ type: 'command', command: 'echo test2' }] },
            { hooks: [{ type: 'command', command: 'echo no-matcher' }] }
          ]
        }
      };
      mockFs.setFile('/home/user/.claude/settings.json', JSON.stringify(settings));
    });

    it('removes hooks with specific matcher', () => {
      settingsService.removeHookFromSettings('global', 'PreToolUse', 'test1');
      
      const written = mockFs.getFile('/home/user/.claude/settings.json');
      const parsed = JSON.parse(written!);
      expect(parsed.hooks.PreToolUse).toHaveLength(2);
      expect(parsed.hooks.PreToolUse.find((h: any) => h.matcher === 'test1')).toBeUndefined();
    });

    it('does nothing when event does not exist', () => {
      settingsService.removeHookFromSettings('global', 'PostToolUse' as any, 'test1');
      
      const written = mockFs.getFile('/home/user/.claude/settings.json');
      const parsed = JSON.parse(written!);
      expect(parsed.hooks.PreToolUse).toHaveLength(3);
    });
  });
});