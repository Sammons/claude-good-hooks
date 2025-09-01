import { describe, it, expect } from 'vitest';
import {
  isHookCommand,
  isHookConfiguration,
  isHookPlugin,
  isClaudeSettings,
  isHookMetadata,
  type HookPlugin,
  type ClaudeSettings,
  type HookMetadata,
} from './index.js';

/**
 * Type Guards Integration Tests
 */

describe('Type Guards - Integration Tests', () => {
  it('should work with real-world data structures', () => {
    const realWorldSettings: ClaudeSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write|Edit|MultiEdit',
            hooks: [
              {
                type: 'command',
                command: 'prettier --write $CLAUDE_PROJECT_DIR',
                timeout: 30000,
              },
              {
                type: 'command',
                command: 'eslint --fix $CLAUDE_PROJECT_DIR --ext .ts,.js',
                timeout: 60000,
              },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              {
                type: 'command',
                command: 'validate-command.py',
                timeout: 10000,
              },
            ],
          },
        ],
      },
    };

    expect(isClaudeSettings(realWorldSettings)).toBe(true);

    // Test individual components
    const hookConfig = realWorldSettings.hooks!.PostToolUse![0];
    expect(isHookConfiguration(hookConfig)).toBe(true);

    const hookCommand = hookConfig.hooks[0];
    expect(isHookCommand(hookCommand)).toBe(true);
  });

  it('should work with complex plugin structures', () => {
    const complexPlugin: HookPlugin = {
      name: 'auto-formatter',
      description: 'Automatically format code after file modifications',
      version: '1.2.3',
      customArgs: {
        languages: {
          description: 'Languages to format',
          type: 'string',
          default: 'typescript,javascript',
          required: false,
        },
        timeout: {
          description: 'Formatting timeout',
          type: 'number',
          default: 30000,
        },
        enabled: {
          description: 'Enable formatting',
          type: 'boolean',
          default: true,
          required: true,
        },
      },
      makeHook: (args) => ({
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [
              {
                type: 'command',
                command: `format-code --languages=${args.languages || 'typescript,javascript'}`,
                timeout: args.timeout || 30000,
              },
            ],
          },
        ],
      }),
    };

    expect(isHookPlugin(complexPlugin)).toBe(true);

    const hookResult = complexPlugin.makeHook({ enabled: true });
    expect(isClaudeSettings({ hooks: hookResult })).toBe(true);
  });

  it('should handle metadata validation for package management', () => {
    const packageMetadata: HookMetadata[] = [
      {
        name: 'local-dev-hook',
        description: 'Local development utilities',
        version: '0.1.0-dev',
        source: 'local',
        installed: true,
      },
      {
        name: 'company-standards',
        description: 'Company coding standards enforcement',
        version: '2.1.0',
        source: 'global',
        installed: true,
        packageName: '@company/claude-hooks-standards',
      },
      {
        name: 'popular-formatter',
        description: 'Popular community formatter',
        version: '3.5.1',
        source: 'remote',
        installed: false,
        packageName: 'claude-hooks-formatter',
      },
    ];

    packageMetadata.forEach((metadata) => {
      expect(isHookMetadata(metadata)).toBe(true);
    });
  });
});