import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyCommand } from './apply.js';
import * as modules from '../utils/modules.js';
import * as settings from '../utils/settings.js';
import type { HookPlugin } from '@sammons/claude-good-hooks-types';

// Mock dependencies
vi.mock('../utils/modules.js');
vi.mock('../utils/settings.js');

const mockLoadHookPlugin = vi.mocked(modules.loadHookPlugin);
const mockAddHookToSettings = vi.mocked(settings.addHookToSettings);

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('applyCommand - Global Scope', () => {
  const globalHookPlugin: HookPlugin = {
    name: 'global-linter',
    description: 'Global linting hook for all projects',
    version: '2.1.0',
    customArgs: {
      severity: {
        description: 'Linting severity level',
        type: 'string',
        default: 'error',
      },
      fixable: {
        description: 'Auto-fix issues when possible',
        type: 'boolean',
        default: false,
      },
      excludePatterns: {
        description: 'Patterns to exclude from linting',
        type: 'string',
      },
    },
    makeHook: (args) => ({
      PreToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: `lint --severity=${args.severity} ${args.fixable ? '--fix' : ''} ${
                args.excludePatterns ? `--exclude="${args.excludePatterns}"` : ''
              }`.trim(),
              timeout: 30,
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write',
          hooks: [
            {
              type: 'command',
              command: 'format-code --check',
              timeout: 15,
            },
          ],
        },
      ],
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('global installation and loading', () => {
    it('should load hook plugin from global scope', async () => {
      mockLoadHookPlugin.mockResolvedValue(globalHookPlugin);

      await applyCommand('global-linter', ['--severity', 'warn'], { global: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('global-linter', true);
    });

    it('should handle global hook loading failure', async () => {
      mockLoadHookPlugin.mockResolvedValue(null);

      await applyCommand('missing-global-hook', [], { global: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('missing-global-hook', true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hook \'missing-global-hook\' not found')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle global hook loading failure in JSON format', async () => {
      mockLoadHookPlugin.mockResolvedValue(null);

      await applyCommand('missing-global-hook', [], { global: true, parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: 'Hook \'missing-global-hook\' not found. Make sure it\'s installed.',
        })
      );
    });
  });

  describe('global hook configuration', () => {
    it('should apply hook to global settings with default arguments', async () => {
      mockLoadHookPlugin.mockResolvedValue(globalHookPlugin);

      await applyCommand('global-linter', [], { global: true, parent: {} });

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'global',
        'PreToolUse',
        expect.objectContaining({
          matcher: 'Write|Edit',
          hooks: expect.arrayContaining([
            expect.objectContaining({
              type: 'command',
              command: 'lint --severity=error',
              timeout: 30,
            }),
          ]),
        })
      );

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'global',
        'PostToolUse',
        expect.objectContaining({
          matcher: 'Write',
          hooks: expect.arrayContaining([
            expect.objectContaining({
              type: 'command',
              command: 'format-code --check',
              timeout: 15,
            }),
          ]),
        })
      );
    });

    it('should apply global hook with custom arguments', async () => {
      mockLoadHookPlugin.mockResolvedValue(globalHookPlugin);

      await applyCommand(
        'global-linter',
        ['--severity', 'warn', '--fixable', '--excludePatterns', '*.test.js'],
        { global: true, parent: {} }
      );

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'global',
        'PreToolUse',
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({
              command: 'lint --severity=warn --fix --exclude="*.test.js"',
            }),
          ]),
        })
      );
    });

    it('should show correct scope in success message', async () => {
      mockLoadHookPlugin.mockResolvedValue(globalHookPlugin);

      await applyCommand('global-linter', [], { global: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Applied hook \'global-linter\' to global settings')
      );
    });

    it('should include global scope in JSON response', async () => {
      mockLoadHookPlugin.mockResolvedValue(globalHookPlugin);

      await applyCommand('global-linter', ['--severity', 'info'], { global: true, parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          success: true,
          hook: 'global-linter',
          scope: 'global',
          args: { severity: 'info', fixable: false },
        })
      );
    });
  });

  describe('global hook help display', () => {
    it('should show global installation suggestion in help', async () => {
      mockLoadHookPlugin.mockResolvedValue(globalHookPlugin);

      await applyCommand('global-linter', [], { help: true, global: true, parent: {} });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('global-linter v2.1.0'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Global linting hook'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('claude-good-hooks apply --global global-linter')
      );
    });

    it('should show global hook help in JSON format', async () => {
      mockLoadHookPlugin.mockResolvedValue(globalHookPlugin);

      await applyCommand('global-linter', [], { help: true, global: true, parent: { json: true } });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          name: 'global-linter',
          description: 'Global linting hook for all projects',
          version: '2.1.0',
          customArgs: globalHookPlugin.customArgs,
          usage: 'claude-good-hooks apply global-linter [options]',
        })
      );
    });
  });

  describe('complex global hook scenarios', () => {
    it('should handle hooks with multiple event types', async () => {
      const multiEventPlugin: HookPlugin = {
        name: 'global-monitor',
        description: 'Global monitoring hook',
        version: '1.0.0',
        makeHook: () => ({
          PreToolUse: [
            {
              matcher: '*',
              hooks: [{ type: 'command', command: 'log-pre-tool' }],
            },
          ],
          PostToolUse: [
            {
              matcher: '*',
              hooks: [{ type: 'command', command: 'log-post-tool' }],
            },
          ],
          SessionStart: [
            {
              hooks: [{ type: 'command', command: 'initialize-session' }],
            },
          ],
          SessionEnd: [
            {
              hooks: [{ type: 'command', command: 'cleanup-session' }],
            },
          ],
        }),
      };

      mockLoadHookPlugin.mockResolvedValue(multiEventPlugin);

      await applyCommand('global-monitor', [], { global: true, parent: {} });

      expect(mockAddHookToSettings).toHaveBeenCalledTimes(4);
      expect(mockAddHookToSettings).toHaveBeenCalledWith('global', 'PreToolUse', expect.anything());
      expect(mockAddHookToSettings).toHaveBeenCalledWith('global', 'PostToolUse', expect.anything());
      expect(mockAddHookToSettings).toHaveBeenCalledWith('global', 'SessionStart', expect.anything());
      expect(mockAddHookToSettings).toHaveBeenCalledWith('global', 'SessionEnd', expect.anything());
    });

    it('should handle global hooks with complex argument structures', async () => {
      const complexArgsPlugin: HookPlugin = {
        name: 'global-security',
        description: 'Global security scanner',
        version: '3.0.0',
        customArgs: {
          scanTypes: {
            description: 'Types of security scans to perform',
            type: 'string',
            default: 'basic,secrets',
          },
          blockOnVulnerabilities: {
            description: 'Block operations on security vulnerabilities',
            type: 'boolean',
            default: true,
          },
          maxSeverity: {
            description: 'Maximum allowed vulnerability severity (1-10)',
            type: 'number',
            default: 8,
          },
        },
        makeHook: (args) => ({
          PreToolUse: [
            {
              matcher: 'Write|Edit',
              hooks: [
                {
                  type: 'command',
                  command: `security-scan --types="${args.scanTypes}" --max-severity=${args.maxSeverity} ${
                    args.blockOnVulnerabilities ? '--block-on-vuln' : ''
                  }`.trim(),
                  timeout: 60,
                },
              ],
            },
          ],
        }),
      };

      mockLoadHookPlugin.mockResolvedValue(complexArgsPlugin);

      await applyCommand(
        'global-security',
        ['--scanTypes', 'advanced,secrets,dependencies', '--maxSeverity', '5'],
        { global: true, parent: { json: true } }
      );

      expect(mockAddHookToSettings).toHaveBeenCalledWith(
        'global',
        'PreToolUse',
        expect.objectContaining({
          hooks: expect.arrayContaining([
            expect.objectContaining({
              command:
                'security-scan --types="advanced,secrets,dependencies" --max-severity=5 --block-on-vuln',
            }),
          ]),
        })
      );

      const jsonCall = consoleSpy.mock.calls.find(call => 
        call[0].includes('"success":true') && call[0].includes('"hook":"global-security"')
      );
      expect(jsonCall).toBeDefined();
      const output = JSON.parse(jsonCall![0]);
      expect(output).toEqual({
        success: true,
        hook: 'global-security',
        scope: 'global',
        args: expect.objectContaining({
          scanTypes: 'advanced,secrets,dependencies',
          blockOnVulnerabilities: true,
          maxSeverity: 5,
        }),
      });
    });
  });

  describe('error scenarios in global context', () => {
    it('should handle hook loading errors gracefully in global mode', async () => {
      mockLoadHookPlugin.mockResolvedValue(null);

      await applyCommand('broken-global-hook', [], { global: true, parent: {} });

      expect(mockLoadHookPlugin).toHaveBeenCalledWith('broken-global-hook', true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hook \'broken-global-hook\' not found')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should prioritize global flag over conflicting local flag', async () => {
      mockLoadHookPlugin.mockResolvedValue(globalHookPlugin);

      await applyCommand('global-linter', [], { global: true, local: true, parent: {} });

      // Global should take precedence
      expect(mockLoadHookPlugin).toHaveBeenCalledWith('global-linter', true);
      expect(mockAddHookToSettings).toHaveBeenCalledWith('global', expect.anything(), expect.anything());
    });
  });
});