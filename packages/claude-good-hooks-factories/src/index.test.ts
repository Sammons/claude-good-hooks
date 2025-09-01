import { describe, it, expect } from 'vitest';
import {
  createDevWorkflowHook,
  quickStartHooks,
  createHookCommand,
  createSimpleHook,
  type HookEventType
} from './index.js';

describe('createDevWorkflowHook', () => {
  it('should create a complete development workflow hook with defaults', () => {
    const hook = createDevWorkflowHook({});
    
    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('Write|Edit');
    expect(hook.hooks.PostToolUse?.[0].hooks).toHaveLength(3);
    
    const commands = hook.hooks.PostToolUse?.[0].hooks.map(h => h.command);
    expect(commands).toContain('npm run lint');
    expect(commands).toContain('npm test');
    expect(commands).toContain('npm run build');
  });

  it('should create workflow hook with custom commands', () => {
    const hook = createDevWorkflowHook({
      lintCommand: 'eslint .',
      testCommand: 'jest',
      buildCommand: 'webpack'
    });
    
    const commands = hook.hooks.PostToolUse?.[0].hooks.map(h => h.command);
    expect(commands).toContain('eslint .');
    expect(commands).toContain('jest');
    expect(commands).toContain('webpack');
  });

  it('should create workflow hook with auto-fix enabled', () => {
    const hook = createDevWorkflowHook({
      lintCommand: 'eslint .',
      autoFix: true
    });
    
    const lintCommand = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(lintCommand).toContain('eslint . --fix');
    expect(lintCommand).toContain('|| eslint .');
  });

  it('should create workflow hook with custom matcher', () => {
    const hook = createDevWorkflowHook({
      matcher: '*.ts'
    });
    
    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('*.ts');
  });
});

describe('quickStartHooks', () => {
  it('should create generic hooks by default', () => {
    const hooks = quickStartHooks();
    
    expect(hooks.hooks.SessionStart).toBeDefined();
    expect(hooks.hooks.SessionEnd).toBeDefined();
    expect(hooks.hooks.PostToolUse).toBeUndefined();
  });

  it('should create generic hooks explicitly', () => {
    const hooks = quickStartHooks('generic');
    
    expect(hooks.hooks.SessionStart).toBeDefined();
    expect(hooks.hooks.SessionEnd).toBeDefined();
    expect(hooks.hooks.PostToolUse).toBeUndefined();
  });

  it('should create React project hooks', () => {
    const hooks = quickStartHooks('react');
    
    expect(hooks.hooks.SessionStart).toBeDefined();
    expect(hooks.hooks.SessionEnd).toBeDefined();
    expect(hooks.hooks.PostToolUse).toBeDefined();
    
    const command = hooks.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toBe('npm run lint && npm test && npm run build');
  });

  it('should create Node project hooks', () => {
    const hooks = quickStartHooks('node');
    
    expect(hooks.hooks.PostToolUse).toBeDefined();
    
    const command = hooks.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toBe('npm run lint && npm test');
  });

  it('should create TypeScript project hooks', () => {
    const hooks = quickStartHooks('typescript');
    
    expect(hooks.hooks.PostToolUse).toBeDefined();
    
    const command = hooks.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toBe('npm run type-check && npm run lint');
  });

  it('should include session hooks in all project types', () => {
    const projectTypes: Array<'react' | 'node' | 'typescript' | 'generic'> = ['react', 'node', 'typescript', 'generic'];
    
    projectTypes.forEach(type => {
      const hooks = quickStartHooks(type);
      
      expect(hooks.hooks.SessionStart).toBeDefined();
      expect(hooks.hooks.SessionEnd).toBeDefined();
      
      expect(hooks.hooks.SessionStart?.[0].hooks[0].command).toContain('Claude session started');
      expect(hooks.hooks.SessionEnd?.[0].hooks[0].command).toContain('Claude session ended');
    });
  });
});

describe('index exports', () => {
  it('should export all core factory functions', () => {
    expect(createHookCommand).toBeDefined();
    expect(typeof createHookCommand).toBe('function');
  });

  it('should export all convenience factory functions', () => {
    expect(createSimpleHook).toBeDefined();
    expect(typeof createSimpleHook).toBe('function');
  });

  it('should export HookEventType', () => {
    // Test that the type exists by using it
    const eventType: HookEventType = 'PostToolUse';
    expect(eventType).toBe('PostToolUse');
  });

  it('should provide working factory functions', () => {
    // Integration test - create a complete hook using exported functions
    const command = createHookCommand('echo test');
    const hook = createSimpleHook('PostToolUse', 'echo test', 'Write');
    
    expect(command.type).toBe('command');
    expect(hook.hooks.PostToolUse).toBeDefined();
  });
});