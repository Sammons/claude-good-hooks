import { describe, it, expect, expectTypeOf } from 'vitest';
import * as TypesModule from './index.js';

/**
 * Exports Tests - Testing that all types and functions are properly exported
 */

describe('Module Exports', () => {
  describe('Type Exports', () => {
    it('should export HookCommand type', () => {
      // Type-only check - this will fail at compile time if HookCommand is not exported
      expectTypeOf<TypesModule.HookCommand>().toEqualTypeOf<{
        type: 'command';
        command: string;
        timeout?: number;
      }>();

      // Check that the type is actually accessible
      const hookCommand: TypesModule.HookCommand = {
        type: 'command',
        command: 'test command',
        timeout: 5000,
      };

      expect(hookCommand.type).toBe('command');
      expect(hookCommand.command).toBe('test command');
      expect(hookCommand.timeout).toBe(5000);
    });

    it('should export HookConfiguration type', () => {
      expectTypeOf<TypesModule.HookConfiguration>().toMatchTypeOf<{
        matcher?: string;
        hooks: TypesModule.HookCommand[];
      }>();

      const hookConfiguration: TypesModule.HookConfiguration = {
        matcher: 'Write',
        hooks: [
          {
            type: 'command',
            command: 'test command',
          },
        ],
      };

      expect(hookConfiguration.matcher).toBe('Write');
      expect(hookConfiguration.hooks).toHaveLength(1);
    });

    it('should export HookPlugin type', () => {
      expectTypeOf<TypesModule.HookPlugin>().toMatchTypeOf<{
        name: string;
        description: string;
        version: string;
        customArgs?: Record<
          string,
          {
            description: string;
            type: 'string' | 'boolean' | 'number';
            default?: any;
            required?: boolean;
          }
        >;
        makeHook: (args: Record<string, any>) => any;
      }>();

      const hookPlugin: TypesModule.HookPlugin = {
        name: 'test-plugin',
        description: 'A test plugin',
        version: '1.0.0',
        makeHook: () => ({}),
      };

      expect(hookPlugin.name).toBe('test-plugin');
      expect(hookPlugin.description).toBe('A test plugin');
      expect(hookPlugin.version).toBe('1.0.0');
      expect(typeof hookPlugin.makeHook).toBe('function');
    });

    it('should export ClaudeSettings type', () => {
      expectTypeOf<TypesModule.ClaudeSettings>().toMatchTypeOf<{
        hooks?: {
          PreToolUse?: TypesModule.HookConfiguration[];
          PostToolUse?: TypesModule.HookConfiguration[];
          UserPromptSubmit?: TypesModule.HookConfiguration[];
          Notification?: TypesModule.HookConfiguration[];
          Stop?: TypesModule.HookConfiguration[];
          SubagentStop?: TypesModule.HookConfiguration[];
          SessionEnd?: TypesModule.HookConfiguration[];
          SessionStart?: TypesModule.HookConfiguration[];
          PreCompact?: TypesModule.HookConfiguration[];
        };
      }>();

      const claudeSettings: TypesModule.ClaudeSettings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Write',
              hooks: [
                {
                  type: 'command',
                  command: 'test command',
                },
              ],
            },
          ],
        },
      };

      expect(claudeSettings.hooks?.PreToolUse).toHaveLength(1);
    });

    it('should export HookMetadata type', () => {
      expectTypeOf<TypesModule.HookMetadata>().toEqualTypeOf<{
        name: string;
        description: string;
        version: string;
        source: 'local' | 'global' | 'remote';
        packageName?: string;
        installed: boolean;
      }>();

      const hookMetadata: TypesModule.HookMetadata = {
        name: 'test-metadata',
        description: 'Test metadata',
        version: '1.0.0',
        source: 'local',
        installed: true,
      };

      expect(hookMetadata.name).toBe('test-metadata');
      expect(hookMetadata.source).toBe('local');
      expect(hookMetadata.installed).toBe(true);
    });
  });

  describe('Type Guard Function Exports', () => {
    it('should export isHookCommand function', () => {
      expect(typeof TypesModule.isHookCommand).toBe('function');
      expect(TypesModule.isHookCommand.name).toBe('isHookCommand');

      // Test functionality
      const validCommand = { type: 'command', command: 'test' };
      const invalidCommand = { type: 'invalid', command: 'test' };

      expect(TypesModule.isHookCommand(validCommand)).toBe(true);
      expect(TypesModule.isHookCommand(invalidCommand)).toBe(false);
    });

    it('should export isHookConfiguration function', () => {
      expect(typeof TypesModule.isHookConfiguration).toBe('function');
      expect(TypesModule.isHookConfiguration.name).toBe('isHookConfiguration');

      // Test functionality
      const validConfiguration = {
        hooks: [{ type: 'command', command: 'test' }],
      };
      const invalidConfiguration = {
        hooks: 'not an array',
      };

      expect(TypesModule.isHookConfiguration(validConfiguration)).toBe(true);
      expect(TypesModule.isHookConfiguration(invalidConfiguration)).toBe(false);
    });

    it('should export isHookPlugin function', () => {
      expect(typeof TypesModule.isHookPlugin).toBe('function');
      expect(TypesModule.isHookPlugin.name).toBe('isHookPlugin');

      // Test functionality
      const validPlugin = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        makeHook: () => ({}),
      };
      const invalidPlugin = {
        name: 'test',
        // missing required fields
      };

      expect(TypesModule.isHookPlugin(validPlugin)).toBe(true);
      expect(TypesModule.isHookPlugin(invalidPlugin)).toBe(false);
    });

    it('should export isClaudeSettings function', () => {
      expect(typeof TypesModule.isClaudeSettings).toBe('function');
      expect(TypesModule.isClaudeSettings.name).toBe('isClaudeSettings');

      // Test functionality
      const validSettings = {
        hooks: {
          PreToolUse: [
            {
              hooks: [{ type: 'command', command: 'test' }],
            },
          ],
        },
      };
      const invalidSettings = {
        hooks: {
          InvalidHookType: [],
        },
      };

      expect(TypesModule.isClaudeSettings(validSettings)).toBe(true);
      expect(TypesModule.isClaudeSettings(invalidSettings)).toBe(false);
    });

    it('should export isHookMetadata function', () => {
      expect(typeof TypesModule.isHookMetadata).toBe('function');
      expect(TypesModule.isHookMetadata.name).toBe('isHookMetadata');

      // Test functionality
      const validMetadata = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        source: 'local' as const,
        installed: true,
      };
      const invalidMetadata = {
        name: 'test',
        description: 'test',
        version: '1.0.0',
        source: 'invalid',
        installed: true,
      };

      expect(TypesModule.isHookMetadata(validMetadata)).toBe(true);
      expect(TypesModule.isHookMetadata(invalidMetadata)).toBe(false);
    });
  });

  describe('Complete Export Verification', () => {
    it('should export all expected identifiers', () => {
      const expectedExports = [
        // Types (these are type-only exports, so we check indirectly)
        'HookCommand',
        'HookConfiguration', 
        'HookPlugin',
        'ClaudeSettings',
        'HookMetadata',
        
        // Functions
        'isHookCommand',
        'isHookConfiguration',
        'isHookPlugin',
        'isClaudeSettings',
        'isHookMetadata',
      ];

      const actualExports = Object.keys(TypesModule);
      
      // Check that all expected function exports are present
      const expectedFunctionExports = expectedExports.filter(name => name.startsWith('is'));
      expectedFunctionExports.forEach(exportName => {
        expect(actualExports).toContain(exportName);
        expect(typeof (TypesModule as any)[exportName]).toBe('function');
      });

      // For types, we check that they can be used (compile-time check)
      // This is verified by the individual type tests above
    });

    it('should not export any unexpected identifiers', () => {
      const actualExports = Object.keys(TypesModule);
      const expectedExports = [
        'isHookCommand',
        'isHookConfiguration',
        'isHookPlugin',
        'isClaudeSettings',
        'isHookMetadata',
      ];

      // All exported identifiers should be expected
      actualExports.forEach(exportName => {
        expect(expectedExports).toContain(exportName);
      });
    });

    it('should allow destructuring imports', () => {
      // This tests that named exports work correctly
      const {
        isHookCommand,
        isHookConfiguration,
        isHookPlugin,
        isClaudeSettings,
        isHookMetadata,
      } = TypesModule;

      expect(typeof isHookCommand).toBe('function');
      expect(typeof isHookConfiguration).toBe('function');
      expect(typeof isHookPlugin).toBe('function');
      expect(typeof isClaudeSettings).toBe('function');
      expect(typeof isHookMetadata).toBe('function');
    });
  });

  describe('Type Relationships', () => {
    it('should maintain proper type relationships between exports', () => {
      // HookCommand should be usable in HookConfiguration
      const command: TypesModule.HookCommand = {
        type: 'command',
        command: 'test',
      };

      const configuration: TypesModule.HookConfiguration = {
        hooks: [command],
      };

      expect(TypesModule.isHookCommand(command)).toBe(true);
      expect(TypesModule.isHookConfiguration(configuration)).toBe(true);
    });

    it('should support complex nested type usage', () => {
      // Create a complex structure using all exported types
      const plugin: TypesModule.HookPlugin = {
        name: 'complex-plugin',
        description: 'A complex plugin using all types',
        version: '1.0.0',
        customArgs: {
          enabled: {
            description: 'Enable the plugin',
            type: 'boolean',
            default: true,
          },
          command: {
            description: 'Command to run',
            type: 'string',
            required: true,
          },
        },
        makeHook: (args) => ({
          PostToolUse: [
            {
              matcher: 'Write',
              hooks: [
                {
                  type: 'command',
                  command: args.command || 'default-command',
                  timeout: 30000,
                },
              ],
            },
          ],
        }),
      };

      const settings: TypesModule.ClaudeSettings = {
        hooks: plugin.makeHook({ command: 'test-command' }),
      };

      const metadata: TypesModule.HookMetadata = {
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        source: 'local',
        installed: true,
      };

      // Verify all types work together
      expect(TypesModule.isHookPlugin(plugin)).toBe(true);
      expect(TypesModule.isClaudeSettings(settings)).toBe(true);
      expect(TypesModule.isHookMetadata(metadata)).toBe(true);
    });

    it('should support TypeScript inference with exported types', () => {
      // This tests that TypeScript can properly infer types from our exports
      const createHookCommand = (command: string, timeout?: number): TypesModule.HookCommand => ({
        type: 'command',
        command,
        timeout,
      });

      const createHookConfiguration = (
        matcher: string,
        commands: string[]
      ): TypesModule.HookConfiguration => ({
        matcher,
        hooks: commands.map(cmd => createHookCommand(cmd)),
      });

      const config = createHookConfiguration('Write', ['prettier', 'eslint']);

      // Verify the structure is correct  
      expect(config.matcher).toBe('Write');
      expect(config.hooks).toHaveLength(2);
      expect(config.hooks[0].command).toBe('prettier');
      expect(config.hooks[1].command).toBe('eslint');
      
      // Test individual hook commands first
      expect(TypesModule.isHookCommand(config.hooks[0])).toBe(true);
      expect(TypesModule.isHookCommand(config.hooks[1])).toBe(true);
      
      // Now test the full configuration
      expect(TypesModule.isHookConfiguration(config)).toBe(true);
    });
  });

  describe('Module Structure', () => {
    it('should be a proper ES module', () => {
      // The import should work (we're using it)
      expect(TypesModule).toBeDefined();
      expect(typeof TypesModule).toBe('object');
    });

    it('should support both named and namespace imports', () => {
      // This test verifies that both import patterns work:
      // import * as TypesModule from './index.js' (used in this file)
      // import { HookCommand, isHookCommand } from './index.js' (used in other tests)
      
      expect(TypesModule).toBeDefined();
      
      // These should be accessible through namespace import
      expect(TypesModule.isHookCommand).toBeDefined();
      expect(TypesModule.isHookConfiguration).toBeDefined();
      expect(TypesModule.isHookPlugin).toBeDefined();
      expect(TypesModule.isClaudeSettings).toBeDefined();
      expect(TypesModule.isHookMetadata).toBeDefined();
    });

    it('should maintain consistent function signatures', () => {
      // All type guard functions should have the same signature pattern
      const typeGuards = [
        TypesModule.isHookCommand,
        TypesModule.isHookConfiguration,
        TypesModule.isHookPlugin,
        TypesModule.isClaudeSettings,
        TypesModule.isHookMetadata,
      ];

      typeGuards.forEach(guard => {
        expect(typeof guard).toBe('function');
        expect(guard.length).toBe(1); // Should take exactly one argument
      });
    });
  });
});