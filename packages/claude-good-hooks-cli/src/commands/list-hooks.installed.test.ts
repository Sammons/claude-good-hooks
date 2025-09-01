import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listHooks } from './list-hooks.js';
import * as settingsModule from '../utils/settings.js';
import * as modulesModule from '../utils/modules.js';
import type { HookPlugin, HookMetadata, ClaudeSettings } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../utils/settings.js');
vi.mock('../utils/modules.js');

const mockReadSettings = vi.mocked(settingsModule.readSettings);
const mockGetInstalledHookModules = vi.mocked(modulesModule.getInstalledHookModules);
const mockLoadHookPlugin = vi.mocked(modulesModule.loadHookPlugin);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('listHooks - Installed Hooks', () => {
  const mockLocalPlugin: HookPlugin = {
    name: 'local-formatter',
    description: 'Local code formatter hook',
    version: '1.2.3',
  } as HookPlugin;

  const mockGlobalPlugin: HookPlugin = {
    name: 'global-linter',
    description: 'Global linting hook',
    version: '2.0.1',
  } as HookPlugin;

  const mockSettingsWithHooks: ClaudeSettings = {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [{ type: 'command', command: 'echo "pre-tool"' }],
        },
      ],
      PostToolUse: [
        {
          hooks: [{ type: 'command', command: 'echo "post-tool"' }],
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('local installed hooks listing', () => {
    it('should list installed local hooks with plugin information', async () => {
      mockGetInstalledHookModules.mockReturnValue(['local-formatter', 'another-local-hook']);
      mockLoadHookPlugin
        .mockResolvedValueOnce(mockLocalPlugin)
        .mockResolvedValueOnce({
          name: 'another-local',
          description: 'Another local hook',
          version: '0.1.0',
        } as HookPlugin);
      mockReadSettings.mockReturnValue({});

      await listHooks({ installed: true, parent: {} });

      expect(mockGetInstalledHookModules).toHaveBeenCalledWith(undefined);
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('local-formatter', undefined);
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('another-local-hook', undefined);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available Hooks (project):'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ local-formatter v1.2.3'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Local code formatter hook'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Package: local-formatter'));
    });

    it('should list installed global hooks when global flag is set', async () => {
      mockGetInstalledHookModules.mockReturnValue(['global-linter']);
      mockLoadHookPlugin.mockResolvedValue(mockGlobalPlugin);
      mockReadSettings.mockReturnValue({});

      await listHooks({ installed: true, global: true, parent: {} });

      expect(mockGetInstalledHookModules).toHaveBeenCalledWith(true);
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('global-linter', true);
      expect(mockReadSettings).toHaveBeenCalledWith('global');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available Hooks (global):'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ global-linter v2.0.1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Global linting hook'));
    });

    it('should return JSON output when json flag is set', async () => {
      mockGetInstalledHookModules.mockReturnValue(['local-formatter']);
      mockLoadHookPlugin.mockResolvedValue(mockLocalPlugin);
      mockReadSettings.mockReturnValue({});

      await listHooks({ installed: true, json: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(
          [
            {
              name: 'local-formatter',
              description: 'Local code formatter hook',
              version: '1.2.3',
              source: 'local',
              packageName: 'local-formatter',
              installed: true,
            },
          ],
          null,
          2
        )
      );
    });

    it('should handle mixed installed modules and configured hooks', async () => {
      mockGetInstalledHookModules.mockReturnValue(['local-formatter']);
      mockLoadHookPlugin.mockResolvedValue(mockLocalPlugin);
      mockReadSettings.mockReturnValue(mockSettingsWithHooks);

      await listHooks({ installed: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('local-formatter v1.2.3'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PreToolUse:Write|Edit'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PostToolUse'));
    });
  });

  describe('configured hooks from settings', () => {
    it('should list hooks configured in settings with proper formatting', async () => {
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockReturnValue(mockSettingsWithHooks);

      await listHooks({ installed: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ PreToolUse:Write|Edit'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configured PreToolUse hook'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ PostToolUse'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configured PostToolUse hook'));
    });

    it('should handle hooks without matchers in settings', async () => {
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockReturnValue({
        hooks: {
          SessionStart: [
            {
              hooks: [{ type: 'command', command: 'echo "session start"' }],
            },
          ],
        },
      });

      await listHooks({ installed: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ SessionStart'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configured SessionStart hook'));
    });

    it('should return JSON output for configured hooks', async () => {
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockReturnValue(mockSettingsWithHooks);

      await listHooks({ installed: true, json: true, parent: {} });

      const expectedHooks = [
        {
          name: 'PreToolUse:Write|Edit',
          description: 'Configured PreToolUse hook',
          version: 'n/a',
          source: 'local',
          installed: true,
        },
        {
          name: 'PostToolUse',
          description: 'Configured PostToolUse hook',
          version: 'n/a',
          source: 'local',
          installed: true,
        },
      ];

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(expectedHooks, null, 2));
    });
  });

  describe('error scenarios', () => {
    it('should handle plugin loading failures gracefully', async () => {
      mockGetInstalledHookModules.mockReturnValue(['broken-plugin']);
      mockLoadHookPlugin.mockResolvedValue(null);
      mockReadSettings.mockReturnValue({});

      await listHooks({ installed: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('broken-plugin', undefined);
      // Should not crash and should show "No hooks found" since plugin loading failed
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hooks found'));
    });

    it('should handle settings reading errors', async () => {
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockImplementation(() => {
        throw new Error('Settings file corrupted');
      });

      await expect(listHooks({ installed: true, parent: {} })).rejects.toThrow(
        'Settings file corrupted'
      );
    });

    it('should handle getInstalledHookModules errors', async () => {
      mockGetInstalledHookModules.mockImplementation(() => {
        throw new Error('npm ls failed');
      });
      mockReadSettings.mockReturnValue({});

      await expect(listHooks({ installed: true, parent: {} })).rejects.toThrow('npm ls failed');
    });
  });

  describe('empty states', () => {
    it('should display "No hooks found" when no hooks are installed or configured', async () => {
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockReturnValue({});

      await listHooks({ installed: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hooks found'));
    });

    it('should return empty array in JSON when no hooks found', async () => {
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockReturnValue({});

      await listHooks({ installed: true, json: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify([], null, 2));
    });

    it('should handle empty settings with hooks property', async () => {
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockReturnValue({ hooks: {} });

      await listHooks({ installed: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No hooks found'));
    });
  });

  describe('complex hook configurations', () => {
    it('should handle multiple hook configurations per event', async () => {
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockReturnValue({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Write',
              hooks: [{ type: 'command', command: 'lint' }],
            },
            {
              matcher: 'Edit',
              hooks: [{ type: 'command', command: 'format' }],
            },
          ],
        },
      });

      await listHooks({ installed: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ PreToolUse:Write'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ PreToolUse:Edit'));
    });

    it('should handle all hook event types', async () => {
      mockGetInstalledHookModules.mockReturnValue([]);
      mockReadSettings.mockReturnValue({
        hooks: {
          PreToolUse: [{ hooks: [{ type: 'command', command: 'pre' }] }],
          PostToolUse: [{ hooks: [{ type: 'command', command: 'post' }] }],
          UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'prompt' }] }],
          Notification: [{ hooks: [{ type: 'command', command: 'notify' }] }],
          Stop: [{ hooks: [{ type: 'command', command: 'stop' }] }],
          SubagentStop: [{ hooks: [{ type: 'command', command: 'sub-stop' }] }],
          SessionEnd: [{ hooks: [{ type: 'command', command: 'end' }] }],
          SessionStart: [{ hooks: [{ type: 'command', command: 'start' }] }],
          PreCompact: [{ hooks: [{ type: 'command', command: 'compact' }] }],
        },
      });

      await listHooks({ installed: true, json: true, parent: {} });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output).toHaveLength(9);
      expect(output.map((h: any) => h.name)).toContain('PreToolUse');
      expect(output.map((h: any) => h.name)).toContain('PostToolUse');
      expect(output.map((h: any) => h.name)).toContain('UserPromptSubmit');
      expect(output.map((h: any) => h.name)).toContain('Notification');
      expect(output.map((h: any) => h.name)).toContain('Stop');
      expect(output.map((h: any) => h.name)).toContain('SubagentStop');
      expect(output.map((h: any) => h.name)).toContain('SessionEnd');
      expect(output.map((h: any) => h.name)).toContain('SessionStart');
      expect(output.map((h: any) => h.name)).toContain('PreCompact');
    });
  });

  describe('scope-specific behavior', () => {
    it('should show correct source in global mode', async () => {
      mockGetInstalledHookModules.mockReturnValue(['global-hook']);
      mockLoadHookPlugin.mockResolvedValue({
        name: 'global-hook',
        description: 'Global hook',
        version: '1.0.0',
      } as HookPlugin);
      mockReadSettings.mockReturnValue(mockSettingsWithHooks);

      await listHooks({ installed: true, global: true, json: true, parent: {} });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output[0].source).toBe('global');
      expect(output[1].source).toBe('global'); // configured hook should also be global
      expect(output[2].source).toBe('global');
    });

    it('should show correct source in local mode', async () => {
      mockGetInstalledHookModules.mockReturnValue(['local-hook']);
      mockLoadHookPlugin.mockResolvedValue({
        name: 'local-hook',
        description: 'Local hook',
        version: '1.0.0',
      } as HookPlugin);
      mockReadSettings.mockReturnValue({});

      await listHooks({ installed: true, json: true, parent: {} });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output[0].source).toBe('local');
    });
  });

  describe('mixed plugin and configuration scenarios', () => {
    it('should combine installed plugins with configured hooks', async () => {
      mockGetInstalledHookModules.mockReturnValue(['test-plugin']);
      mockLoadHookPlugin.mockResolvedValue({
        name: 'test-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      } as HookPlugin);
      mockReadSettings.mockReturnValue(mockSettingsWithHooks);

      await listHooks({ installed: true, json: true, parent: {} });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output).toHaveLength(3); // 1 plugin + 2 configured hooks
      
      const pluginHook = output.find((h: any) => h.name === 'test-plugin');
      expect(pluginHook.packageName).toBe('test-plugin');
      
      const configuredHook = output.find((h: any) => h.name === 'PreToolUse:Write|Edit');
      expect(configuredHook.packageName).toBeUndefined();
    });
  });
});