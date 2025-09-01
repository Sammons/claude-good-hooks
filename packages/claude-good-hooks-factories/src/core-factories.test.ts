import { describe, it, expect } from 'vitest';
import {
  createHookCommand,
  createHookConfiguration,
  createHookPlugin,
  createClaudeSettings
} from './core-factories.js';

describe('createHookCommand', () => {
  it('should create a basic hook command', () => {
    const command = createHookCommand('echo "hello"');
    
    expect(command).toEqual({
      type: 'command',
      command: 'echo "hello"'
    });
  });

  it('should create a hook command with timeout', () => {
    const command = createHookCommand('npm test', 30);
    
    expect(command).toEqual({
      type: 'command',
      command: 'npm test',
      timeout: 30
    });
  });

  it('should throw error for empty command', () => {
    expect(() => createHookCommand('')).toThrow('Command must be a non-empty string');
  });

  it('should throw error for non-string command', () => {
    expect(() => createHookCommand(123 as any)).toThrow('Command must be a non-empty string');
  });

  it('should throw error for negative timeout', () => {
    expect(() => createHookCommand('echo test', -5)).toThrow('Timeout must be a positive number');
  });

  it('should throw error for zero timeout', () => {
    expect(() => createHookCommand('echo test', 0)).toThrow('Timeout must be a positive number');
  });

  it('should throw error for non-number timeout', () => {
    expect(() => createHookCommand('echo test', 'invalid' as any)).toThrow('Timeout must be a positive number');
  });
});

describe('createHookConfiguration', () => {
  it('should create configuration with matcher and single hook', () => {
    const hookCommand = createHookCommand('echo "test"');
    const config = createHookConfiguration('Write', [hookCommand]);
    
    expect(config).toEqual({
      matcher: 'Write',
      hooks: [hookCommand]
    });
  });

  it('should create configuration without matcher', () => {
    const hookCommand = createHookCommand('echo "test"');
    const config = createHookConfiguration(undefined, [hookCommand]);
    
    expect(config).toEqual({
      hooks: [hookCommand]
    });
  });

  it('should accept single hook command instead of array', () => {
    const hookCommand = createHookCommand('echo "test"');
    const config = createHookConfiguration('Write', hookCommand);
    
    expect(config).toEqual({
      matcher: 'Write',
      hooks: [hookCommand]
    });
  });

  it('should throw error for empty hooks array', () => {
    expect(() => createHookConfiguration('Write', [])).toThrow('At least one hook command must be provided');
  });

  it('should throw error for non-string matcher', () => {
    const hookCommand = createHookCommand('echo "test"');
    expect(() => createHookConfiguration(123 as any, [hookCommand])).toThrow('Matcher must be a string');
  });
});

describe('createHookPlugin', () => {
  it('should create a basic plugin', () => {
    const makeHook = (args: any) => ({
      PostToolUse: [createHookConfiguration('Write', [createHookCommand('echo test')])]
    });
    
    const plugin = createHookPlugin('test-plugin', 'A test plugin', '1.0.0', makeHook);
    
    expect(plugin).toEqual({
      name: 'test-plugin',
      description: 'A test plugin',
      version: '1.0.0',
      makeHook
    });
  });

  it('should throw error for empty name', () => {
    const makeHook = () => ({});
    expect(() => createHookPlugin('', 'desc', '1.0.0', makeHook)).toThrow('Plugin name must be a non-empty string');
  });

  it('should throw error for empty description', () => {
    const makeHook = () => ({});
    expect(() => createHookPlugin('name', '', '1.0.0', makeHook)).toThrow('Plugin description must be a non-empty string');
  });

  it('should throw error for empty version', () => {
    const makeHook = () => ({});
    expect(() => createHookPlugin('name', 'desc', '', makeHook)).toThrow('Plugin version must be a non-empty string');
  });

  it('should throw error for non-function makeHook', () => {
    expect(() => createHookPlugin('name', 'desc', '1.0.0', 'not-a-function' as any)).toThrow('makeHook must be a function');
  });
});

describe('createClaudeSettings', () => {
  it('should create Claude settings with hooks', () => {
    const hookConfig = createHookConfiguration('Write', [createHookCommand('echo test')]);
    const hooks = { PostToolUse: [hookConfig] };
    const settings = createClaudeSettings(hooks);
    
    expect(settings).toEqual({ hooks });
  });

  it('should create Claude settings with empty hooks', () => {
    const settings = createClaudeSettings({});
    
    expect(settings).toEqual({ hooks: {} });
  });

  it('should create Claude settings with undefined hooks', () => {
    const settings = createClaudeSettings(undefined);
    
    expect(settings).toEqual({ hooks: undefined });
  });
});