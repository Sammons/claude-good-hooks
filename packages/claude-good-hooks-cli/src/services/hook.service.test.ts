import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookService } from './hook.service.js';
import type { IModuleService, ISettingsService } from './index.js';
import type { HookPlugin, HookMetadata } from '@sammons/claude-good-hooks-types';

// Mock module service
const mockModuleService: IModuleService = {
  isModuleInstalled: vi.fn(),
  loadHookPlugin: vi.fn(),
  getInstalledHookModules: vi.fn(),
  getRemoteHooks: vi.fn(),
  addRemoteHook: vi.fn(),
  removeRemoteHook: vi.fn(),
};

// Mock settings service
const mockSettingsService: ISettingsService = {
  getSettingsPath: vi.fn(),
  readSettings: vi.fn(),
  writeSettings: vi.fn(),
  addHookToSettings: vi.fn(),
  removeHookFromSettings: vi.fn(),
};

describe('HookService', () => {
  let hookService: HookService;

  beforeEach(() => {
    vi.clearAllMocks();
    hookService = new HookService(mockModuleService, mockSettingsService);
  });

  describe('applyHook', () => {
    it('returns error when plugin not found', async () => {
      vi.mocked(mockModuleService.loadHookPlugin).mockResolvedValue(null);

      const result = await hookService.applyHook('test-hook', [], 'global');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('applies hook successfully when plugin exists', async () => {
      const mockPlugin: HookPlugin = {
        name: 'test-hook',
        description: 'Test hook',
        version: '1.0.0',
        makeHook: vi.fn().mockReturnValue({
          PreToolUse: [{ matcher: 'test', hooks: [{ type: 'command', command: 'echo test' }] }]
        })
      };

      vi.mocked(mockModuleService.loadHookPlugin).mockResolvedValue(mockPlugin);

      const result = await hookService.applyHook('test-hook', [], 'global');

      expect(result.success).toBe(true);
      expect(result.hook).toBe('test-hook');
      expect(result.scope).toBe('global');
      expect(mockSettingsService.addHookToSettings).toHaveBeenCalled();
    });
  });

  describe('parseHookArgs', () => {
    it('handles boolean arguments', () => {
      const plugin: HookPlugin = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        customArgs: {
          enable: { description: 'Enable feature', type: 'boolean' }
        },
        makeHook: vi.fn()
      };

      const result = hookService.parseHookArgs(['--enable'], plugin);

      expect(result).toEqual({ enable: true });
    });

    it('handles string arguments', () => {
      const plugin: HookPlugin = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        customArgs: {
          name: { description: 'Name', type: 'string' }
        },
        makeHook: vi.fn()
      };

      const result = hookService.parseHookArgs(['--name', 'test-value'], plugin);

      expect(result).toEqual({ name: 'test-value' });
    });

    it('handles number arguments', () => {
      const plugin: HookPlugin = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        customArgs: {
          count: { description: 'Count', type: 'number' }
        },
        makeHook: vi.fn()
      };

      const result = hookService.parseHookArgs(['--count', '42'], plugin);

      expect(result).toEqual({ count: 42 });
    });

    it('applies default values', () => {
      const plugin: HookPlugin = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        customArgs: {
          timeout: { description: 'Timeout', type: 'number', default: 30 }
        },
        makeHook: vi.fn()
      };

      const result = hookService.parseHookArgs([], plugin);

      expect(result).toEqual({ timeout: 30 });
    });
  });

  describe('getHookHelp', () => {
    it('returns null when plugin not found', async () => {
      vi.mocked(mockModuleService.loadHookPlugin).mockResolvedValue(null);

      const result = await hookService.getHookHelp('non-existent', false);

      expect(result).toBeNull();
    });

    it('returns help info when plugin exists', async () => {
      const mockPlugin: HookPlugin = {
        name: 'test-hook',
        description: 'Test hook description',
        version: '1.0.0',
        customArgs: {
          flag: { description: 'Test flag', type: 'boolean' }
        },
        makeHook: vi.fn()
      };

      vi.mocked(mockModuleService.loadHookPlugin).mockResolvedValue(mockPlugin);

      const result = await hookService.getHookHelp('test-hook', false);

      expect(result).toEqual({
        name: 'test-hook',
        description: 'Test hook description',
        version: '1.0.0',
        customArgs: { flag: { description: 'Test flag', type: 'boolean' } },
        usage: 'claude-good-hooks apply test-hook [options]'
      });
    });
  });

  describe('listInstalledHooks', () => {
    it('returns hooks from both modules and settings', async () => {
      vi.mocked(mockModuleService.getInstalledHookModules).mockReturnValue(['test-module']);
      
      const mockPlugin: HookPlugin = {
        name: 'test-hook',
        description: 'Test hook',
        version: '1.0.0',
        makeHook: vi.fn()
      };
      vi.mocked(mockModuleService.loadHookPlugin).mockResolvedValue(mockPlugin);

      vi.mocked(mockSettingsService.readSettings).mockReturnValue({
        hooks: {
          PreToolUse: [{ matcher: 'test', hooks: [{ type: 'command', command: 'echo test' }] }]
        }
      });

      const result = await hookService.listInstalledHooks('global');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test-hook');
      expect(result[1].name).toBe('PreToolUse:test');
    });
  });
});