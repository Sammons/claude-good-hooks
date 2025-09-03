import { describe, it, expect } from 'vitest';
import templateHook from './index.js';
import type { HookPlugin, HookConfiguration, HookCommand } from '@sammons/claude-good-hooks-types';

describe('Template Hook Plugin - Basic Properties', () => {
  it('should have correct plugin metadata', () => {
    expect(templateHook.name).toBe('template');
    expect(templateHook.description).toBe('A template hook for Claude Code');
    expect(templateHook.version).toBe('1.0.0');
    expect(typeof templateHook.makeHook).toBe('function');
  });

  it('should have properly defined custom arguments', () => {
    expect(templateHook.customArgs).toBeDefined();
    expect(templateHook.customArgs).toHaveProperty('verbose');
    expect(templateHook.customArgs).toHaveProperty('logFile');
    expect(templateHook.customArgs).toHaveProperty('timeout');
  });

  it('should have correct argument types and defaults', () => {
    const { customArgs } = templateHook;

    expect(customArgs!.verbose.type).toBe('boolean');
    expect(customArgs!.verbose.default).toBe(false);
    expect(customArgs!.verbose.description).toBe('Enable verbose output');

    expect(customArgs!.logFile.type).toBe('string');
    expect(customArgs!.logFile.default).toBe('/tmp/hook.log');
    expect(customArgs!.logFile.description).toBe('Path to log file');

    expect(customArgs!.timeout.type).toBe('number');
    expect(customArgs!.timeout.default).toBe(5);
    expect(customArgs!.timeout.description).toBe('Command timeout in seconds');
  });
});

describe('Template Hook Plugin - Default Configuration Scenario', () => {
  it('should generate correct hooks with default arguments', () => {
    const hooks = templateHook.makeHook({});

    expect(hooks).toHaveProperty('PreToolUse');
    expect(hooks).toHaveProperty('PostToolUse');
    expect(Array.isArray(hooks.PreToolUse)).toBe(true);
    expect(Array.isArray(hooks.PostToolUse)).toBe(true);
  });

  it('should have correct PreToolUse configuration with defaults', () => {
    const hooks = templateHook.makeHook({});
    const preToolUseHooks = hooks.PreToolUse!;

    // Should have one hook configuration for Write|Edit matcher
    expect(preToolUseHooks).toHaveLength(1);

    const writeEditHook = preToolUseHooks[0];
    expect(writeEditHook.matcher).toBe('Write|Edit');
    expect(writeEditHook.hooks).toHaveLength(1);

    const command = writeEditHook.hooks[0];
    expect(command.type).toBe('command');
    expect(command.command).toBe('echo "About to modify a file"');
    expect(command.timeout).toBe(5000); // 5 seconds in milliseconds
  });

  it('should have correct PostToolUse configuration with defaults', () => {
    const hooks = templateHook.makeHook({});
    const postToolUseHooks = hooks.PostToolUse!;

    // Should have one hook configuration for Bash matcher
    expect(postToolUseHooks).toHaveLength(1);

    const bashHook = postToolUseHooks[0];
    expect(bashHook.matcher).toBe('Bash');
    expect(bashHook.hooks).toHaveLength(1);

    const command = bashHook.hooks[0];
    expect(command.type).toBe('command');
    expect(command.command).toBe('echo "Command executed"');
    expect(command.timeout).toBe(5000);
  });
});

describe('Template Hook Plugin - Verbose Mode Enabled Scenario', () => {
  it('should generate additional verbose hook when verbose is true', () => {
    const hooks = templateHook.makeHook({ verbose: true });
    const preToolUseHooks = hooks.PreToolUse!;

    // Should have two hook configurations when verbose is enabled
    expect(preToolUseHooks).toHaveLength(2);

    // First hook should be the verbose logging hook
    const verboseHook = preToolUseHooks[0];
    expect(verboseHook.matcher).toBe('*');
    expect(verboseHook.hooks).toHaveLength(1);

    const verboseCommand = verboseHook.hooks[0];
    expect(verboseCommand.type).toBe('command');
    expect(verboseCommand.command).toBe('echo "Verbose mode enabled, logging to /tmp/hook.log"');
    expect(verboseCommand.timeout).toBe(5000);
  });

  it('should modify commands to use log file when verbose is true', () => {
    const hooks = templateHook.makeHook({ verbose: true });

    // Check PreToolUse Write|Edit hook
    const preToolUseHooks = hooks.PreToolUse!;
    const writeEditHook = preToolUseHooks[1]; // Second hook after verbose hook
    expect(writeEditHook.hooks[0].command).toBe(
      'echo "[$(date)] File modification" >> /tmp/hook.log'
    );

    // Check PostToolUse Bash hook
    const postToolUseHooks = hooks.PostToolUse!;
    const bashHook = postToolUseHooks[0];
    expect(bashHook.hooks[0].command).toBe('echo "[$(date)] Command executed" >> /tmp/hook.log');
  });
});

describe('Template Hook Plugin - Custom Log File Path Scenario', () => {
  it('should use custom log file path in commands', () => {
    const customLogFile = '/var/log/custom.log';
    const hooks = templateHook.makeHook({
      verbose: true,
      logFile: customLogFile,
    });

    // Check verbose hook uses custom log file
    const preToolUseHooks = hooks.PreToolUse!;
    const verboseHook = preToolUseHooks[0];
    expect(verboseHook.hooks[0].command).toBe(
      `echo "Verbose mode enabled, logging to ${customLogFile}"`
    );

    // Check PreToolUse Write|Edit hook uses custom log file
    const writeEditHook = preToolUseHooks[1];
    expect(writeEditHook.hooks[0].command).toBe(
      `echo "[$(date)] File modification" >> ${customLogFile}`
    );

    // Check PostToolUse Bash hook uses custom log file
    const postToolUseHooks = hooks.PostToolUse!;
    const bashHook = postToolUseHooks[0];
    expect(bashHook.hooks[0].command).toBe(`echo "[$(date)] Command executed" >> ${customLogFile}`);
  });

  it('should handle special characters in log file path', () => {
    const specialLogFile = '/tmp/log file with spaces.log';
    const hooks = templateHook.makeHook({
      verbose: true,
      logFile: specialLogFile,
    });

    const preToolUseHooks = hooks.PreToolUse!;
    const verboseHook = preToolUseHooks[0];
    expect(verboseHook.hooks[0].command).toBe(
      `echo "Verbose mode enabled, logging to ${specialLogFile}"`
    );
  });
});

describe('Template Hook Plugin - Custom Timeout Values Scenario', () => {
  it('should apply custom timeout to all commands', () => {
    const customTimeout = 10;
    const hooks = templateHook.makeHook({
      verbose: true,
      timeout: customTimeout,
    });

    // Check verbose hook timeout
    const preToolUseHooks = hooks.PreToolUse!;
    const verboseHook = preToolUseHooks[0];
    expect(verboseHook.hooks[0].timeout).toBe(customTimeout * 1000);

    // Check PreToolUse Write|Edit hook timeout
    const writeEditHook = preToolUseHooks[1];
    expect(writeEditHook.hooks[0].timeout).toBe(customTimeout * 1000);

    // Check PostToolUse Bash hook timeout
    const postToolUseHooks = hooks.PostToolUse!;
    const bashHook = postToolUseHooks[0];
    expect(bashHook.hooks[0].timeout).toBe(customTimeout * 1000);
  });

  it('should handle zero timeout with default fallback', () => {
    const hooks = templateHook.makeHook({ timeout: 0 });

    const preToolUseHooks = hooks.PreToolUse!;
    const writeEditHook = preToolUseHooks[0];
    expect(writeEditHook.hooks[0].timeout).toBe(5000); // Falls back to default 5 seconds because 0 is falsy
  });

  it('should handle fractional timeout values', () => {
    const hooks = templateHook.makeHook({ timeout: 2.5 });

    const preToolUseHooks = hooks.PreToolUse!;
    const writeEditHook = preToolUseHooks[0];
    expect(writeEditHook.hooks[0].timeout).toBe(2500);
  });
});

describe('Template Hook Plugin - Combinations of Arguments Scenario', () => {
  it('should handle all custom arguments together', () => {
    const args = {
      verbose: true,
      logFile: '/custom/path/hooks.log',
      timeout: 15,
    };

    const hooks = templateHook.makeHook(args);

    // Should have 2 PreToolUse hooks when verbose is enabled
    expect(hooks.PreToolUse).toHaveLength(2);
    expect(hooks.PostToolUse).toHaveLength(1);

    // Check verbose hook
    const verboseHook = hooks.PreToolUse![0];
    expect(verboseHook.matcher).toBe('*');
    expect(verboseHook.hooks[0].command).toBe(
      'echo "Verbose mode enabled, logging to /custom/path/hooks.log"'
    );
    expect(verboseHook.hooks[0].timeout).toBe(15000);

    // Check Write|Edit hook
    const writeEditHook = hooks.PreToolUse![1];
    expect(writeEditHook.hooks[0].command).toBe(
      'echo "[$(date)] File modification" >> /custom/path/hooks.log'
    );
    expect(writeEditHook.hooks[0].timeout).toBe(15000);

    // Check Bash hook
    const bashHook = hooks.PostToolUse![0];
    expect(bashHook.hooks[0].command).toBe(
      'echo "[$(date)] Command executed" >> /custom/path/hooks.log'
    );
    expect(bashHook.hooks[0].timeout).toBe(15000);
  });

  it('should handle verbose false with custom log file and timeout', () => {
    const args = {
      verbose: false,
      logFile: '/will/not/be/used.log',
      timeout: 20,
    };

    const hooks = templateHook.makeHook(args);

    // Should have only 1 PreToolUse hook when verbose is false
    expect(hooks.PreToolUse).toHaveLength(1);

    const writeEditHook = hooks.PreToolUse![0];
    expect(writeEditHook.hooks[0].command).toBe('echo "About to modify a file"');
    expect(writeEditHook.hooks[0].timeout).toBe(20000);

    const bashHook = hooks.PostToolUse![0];
    expect(bashHook.hooks[0].command).toBe('echo "Command executed"');
    expect(bashHook.hooks[0].timeout).toBe(20000);
  });

  it('should handle partial argument configurations', () => {
    const hooks = templateHook.makeHook({ verbose: true });

    // Should use defaults for missing arguments
    const verboseHook = hooks.PreToolUse![0];
    expect(verboseHook.hooks[0].command).toBe(
      'echo "Verbose mode enabled, logging to /tmp/hook.log"'
    );
    expect(verboseHook.hooks[0].timeout).toBe(5000);
  });

  it('should handle empty arguments object', () => {
    const hooks = templateHook.makeHook({});

    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);

    // Should use default behavior
    const writeEditHook = hooks.PreToolUse![0];
    expect(writeEditHook.hooks[0].command).toBe('echo "About to modify a file"');
    expect(writeEditHook.hooks[0].timeout).toBe(5000);
  });
});

describe('Template Hook Plugin - Hook Configuration Structure Validation', () => {
  it('should return properly structured hook configuration', () => {
    const hooks = templateHook.makeHook({ verbose: true });

    // Validate overall structure
    expect(hooks).toHaveProperty('PreToolUse');
    expect(hooks).toHaveProperty('PostToolUse');

    // Validate PreToolUse structure
    expect(Array.isArray(hooks.PreToolUse)).toBe(true);
    hooks.PreToolUse!.forEach((config: HookConfiguration) => {
      expect(config).toHaveProperty('matcher');
      expect(config).toHaveProperty('hooks');
      expect(Array.isArray(config.hooks)).toBe(true);

      config.hooks.forEach((hook: HookCommand) => {
        expect(hook.type).toBe('command');
        expect(typeof hook.command).toBe('string');
        expect(typeof hook.timeout).toBe('number');
      });
    });

    // Validate PostToolUse structure
    expect(Array.isArray(hooks.PostToolUse)).toBe(true);
    hooks.PostToolUse!.forEach((config: HookConfiguration) => {
      expect(config).toHaveProperty('matcher');
      expect(config).toHaveProperty('hooks');
      expect(Array.isArray(config.hooks)).toBe(true);

      config.hooks.forEach((hook: HookCommand) => {
        expect(hook.type).toBe('command');
        expect(typeof hook.command).toBe('string');
        expect(typeof hook.timeout).toBe('number');
      });
    });
  });

  it('should have correct matcher patterns', () => {
    const hooks = templateHook.makeHook({ verbose: true });

    const matchers = hooks.PreToolUse!.map(config => config.matcher);
    expect(matchers).toContain('*'); // Verbose hook matcher
    expect(matchers).toContain('Write|Edit'); // File modification hook matcher

    const postMatchers = hooks.PostToolUse!.map(config => config.matcher);
    expect(postMatchers).toContain('Bash'); // Command execution hook matcher
  });

  it('should have non-empty command strings', () => {
    const hooks = templateHook.makeHook({ verbose: true });

    const allHooks = [...hooks.PreToolUse!, ...hooks.PostToolUse!];
    allHooks.forEach(config => {
      config.hooks.forEach(hook => {
        expect(hook.command.length).toBeGreaterThan(0);
        expect(hook.command.trim()).toBe(hook.command); // No leading/trailing whitespace
      });
    });
  });

  it('should have positive timeout values', () => {
    const hooks = templateHook.makeHook({ timeout: 10 });

    const allHooks = [...hooks.PreToolUse!, ...hooks.PostToolUse!];
    allHooks.forEach(config => {
      config.hooks.forEach(hook => {
        expect(hook.timeout).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

describe('Template Hook Plugin - Edge Cases and Error Handling', () => {
  it('should handle undefined timeout gracefully', () => {
    const hooks = templateHook.makeHook({ timeout: undefined });

    const writeEditHook = hooks.PreToolUse![0];
    expect(writeEditHook.hooks[0].timeout).toBe(5000); // Should default to 5 seconds
  });

  it('should handle null timeout gracefully', () => {
    const hooks = templateHook.makeHook({ timeout: null });

    const writeEditHook = hooks.PreToolUse![0];
    expect(writeEditHook.hooks[0].timeout).toBe(5000); // Should default to 5 seconds
  });

  it('should handle extremely large timeout values', () => {
    const largeTimeout = 999999;
    const hooks = templateHook.makeHook({ timeout: largeTimeout });

    const writeEditHook = hooks.PreToolUse![0];
    expect(writeEditHook.hooks[0].timeout).toBe(largeTimeout * 1000);
  });

  it('should handle empty string log file with default fallback', () => {
    const hooks = templateHook.makeHook({
      verbose: true,
      logFile: '',
    });

    const verboseHook = hooks.PreToolUse![0];
    expect(verboseHook.hooks[0].command).toBe(
      'echo "Verbose mode enabled, logging to /tmp/hook.log"'
    ); // Falls back to default

    const writeEditHook = hooks.PreToolUse![1];
    expect(writeEditHook.hooks[0].command).toBe(
      'echo "[$(date)] File modification" >> /tmp/hook.log'
    ); // Falls back to default
  });

  it('should handle boolean values for non-boolean arguments', () => {
    const hooks = templateHook.makeHook({
      timeout: true as any, // Invalid type
      logFile: false as any, // Invalid type
    });

    // Should handle gracefully - these will be truthy/falsy values
    expect(hooks.PreToolUse).toBeDefined();
    expect(hooks.PostToolUse).toBeDefined();
  });

  it('should provide correct plugin interface', () => {
    // Test that the plugin conforms to HookPlugin interface
    const plugin: HookPlugin = templateHook;

    expect(typeof plugin.name).toBe('string');
    expect(typeof plugin.description).toBe('string');
    expect(typeof plugin.version).toBe('string');
    expect(typeof plugin.makeHook).toBe('function');

    if (plugin.customArgs) {
      Object.values(plugin.customArgs).forEach(arg => {
        expect(['string', 'boolean', 'number']).toContain(arg.type);
        expect(typeof arg.description).toBe('string');
      });
    }
  });

  it('should handle negative timeout values by enforcing minimum', () => {
    const hooks = templateHook.makeHook({ timeout: -5 });

    const writeEditHook = hooks.PreToolUse![0];
    expect(writeEditHook.hooks[0].timeout).toBe(1000); // Math.max(1, -5) = 1 second
  });

  it('should handle verbose argument with various truthy/falsy values', () => {
    // Test truthy values
    let hooks = templateHook.makeHook({ verbose: 1 });
    expect(hooks.PreToolUse).toHaveLength(2); // Should have verbose hook

    hooks = templateHook.makeHook({ verbose: 'true' });
    expect(hooks.PreToolUse).toHaveLength(2);

    // Test falsy values
    hooks = templateHook.makeHook({ verbose: 0 });
    expect(hooks.PreToolUse).toHaveLength(1); // Should not have verbose hook

    hooks = templateHook.makeHook({ verbose: '' });
    expect(hooks.PreToolUse).toHaveLength(1);
  });

  it('should handle nullish coalescing for verbose argument', () => {
    // Test that undefined and null are handled correctly
    let hooks = templateHook.makeHook({ verbose: undefined });
    expect(hooks.PreToolUse).toHaveLength(1); // Should default to false

    hooks = templateHook.makeHook({ verbose: null });
    expect(hooks.PreToolUse).toHaveLength(1); // Should default to false
  });
});
