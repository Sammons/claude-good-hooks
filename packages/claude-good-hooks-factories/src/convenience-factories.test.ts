import { describe, it, expect } from 'vitest';
import {
  createSimpleHook,
  createFileWatcherHook,
  createConditionalHook,
  createMultiStepHook,
  createDebouncedHook
} from './convenience-factories.js';

describe('createSimpleHook', () => {
  it('should create a simple hook with matcher', () => {
    const hook = createSimpleHook('PostToolUse', 'echo "test"', 'Write');
    
    expect(hook).toEqual({
      hooks: {
        PostToolUse: [{
          matcher: 'Write',
          hooks: [{
            type: 'command',
            command: 'echo "test"'
          }]
        }]
      }
    });
  });

  it('should create a simple hook without matcher', () => {
    const hook = createSimpleHook('SessionStart', 'echo "session started"');
    
    expect(hook).toEqual({
      hooks: {
        SessionStart: [{
          hooks: [{
            type: 'command',
            command: 'echo "session started"'
          }]
        }]
      }
    });
  });

  it('should create a simple hook with timeout', () => {
    const hook = createSimpleHook('PostToolUse', 'npm test', 'Write', 60);
    
    expect(hook.hooks.PostToolUse?.[0].hooks[0]).toEqual({
      type: 'command',
      command: 'npm test',
      timeout: 60
    });
  });
});

describe('createFileWatcherHook', () => {
  it('should create a file watcher hook with single pattern', () => {
    const hook = createFileWatcherHook(['Write'], 'echo "file changed"');
    
    expect(hook).toEqual({
      hooks: {
        PostToolUse: [{
          matcher: 'Write',
          hooks: [{
            type: 'command',
            command: 'echo "file changed"'
          }]
        }]
      }
    });
  });

  it('should create a file watcher hook with multiple patterns', () => {
    const hook = createFileWatcherHook(['Write', 'Edit'], 'echo "file changed"');
    
    expect(hook).toEqual({
      hooks: {
        PostToolUse: [
          {
            matcher: 'Write',
            hooks: [{
              type: 'command',
              command: 'echo "file changed"'
            }]
          },
          {
            matcher: 'Edit',
            hooks: [{
              type: 'command',
              command: 'echo "file changed"'
            }]
          }
        ]
      }
    });
  });

  it('should create a file watcher hook with timeout', () => {
    const hook = createFileWatcherHook(['Write'], 'npm test', 30);
    
    expect(hook.hooks.PostToolUse?.[0].hooks[0]).toEqual({
      type: 'command',
      command: 'npm test',
      timeout: 30
    });
  });

  it('should throw error for empty patterns', () => {
    expect(() => createFileWatcherHook([], 'echo test')).toThrow('At least one pattern must be provided');
  });
});

describe('createConditionalHook', () => {
  it('should create a conditional hook with both commands', () => {
    const hook = createConditionalHook(
      'test -f package.json',
      'npm run build',
      'echo "no package.json"'
    );
    
    expect(hook.hooks.PostToolUse?.[0].hooks[0].command).toBe(
      'if test -f package.json; then npm run build; else echo "no package.json"; fi'
    );
  });

  it('should create a conditional hook with only true command', () => {
    const hook = createConditionalHook(
      'test -f package.json',
      'npm run build'
    );
    
    expect(hook.hooks.PostToolUse?.[0].hooks[0].command).toBe(
      'if test -f package.json; then npm run build; fi'
    );
  });

  it('should create a conditional hook with custom event type', () => {
    const hook = createConditionalHook(
      'test -f .env',
      'echo "env found"',
      undefined,
      'PreToolUse'
    );
    
    expect(hook.hooks.PreToolUse).toBeDefined();
    expect(hook.hooks.PostToolUse).toBeUndefined();
  });

  it('should create a conditional hook with matcher', () => {
    const hook = createConditionalHook(
      'git status --porcelain',
      'git add .',
      undefined,
      'PostToolUse',
      'Write'
    );
    
    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('Write');
  });

  it('should throw error for empty condition', () => {
    expect(() => createConditionalHook('', 'echo test')).toThrow('Condition must be a non-empty string');
  });

  it('should throw error for empty true command', () => {
    expect(() => createConditionalHook('test -f file', '')).toThrow('True command must be a non-empty string');
  });
});

describe('createMultiStepHook', () => {
  it('should create a multi-step hook', () => {
    const hook = createMultiStepHook(['echo "step1"', 'echo "step2"']);
    
    expect(hook).toEqual({
      hooks: {
        PostToolUse: [{
          hooks: [
            {
              type: 'command',
              command: 'echo "step1"'
            },
            {
              type: 'command',
              command: 'echo "step2"'
            }
          ]
        }]
      }
    });
  });

  it('should create a multi-step hook with matcher and timeout', () => {
    const hook = createMultiStepHook(['npm lint', 'npm test'], 'PreToolUse', 'Write', 60);
    
    expect(hook.hooks.PreToolUse?.[0].matcher).toBe('Write');
    expect(hook.hooks.PreToolUse?.[0].hooks).toHaveLength(2);
    expect(hook.hooks.PreToolUse?.[0].hooks[0].timeout).toBe(60);
    expect(hook.hooks.PreToolUse?.[0].hooks[1].timeout).toBe(60);
  });

  it('should throw error for empty commands array', () => {
    expect(() => createMultiStepHook([])).toThrow('At least one command must be provided');
  });
});

describe('createDebouncedHook', () => {
  it('should create a debounced hook', () => {
    const hook = createDebouncedHook('npm test', 30);
    
    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('npm test');
    expect(command).toContain('30');
    expect(command).toContain('/tmp/claude-hook-debounce.lock');
  });

  it('should create a debounced hook with custom event and matcher', () => {
    const hook = createDebouncedHook('echo test', 60, 'PreToolUse', 'Write', 120);
    
    expect(hook.hooks.PreToolUse?.[0].matcher).toBe('Write');
    expect(hook.hooks.PreToolUse?.[0].hooks[0].timeout).toBe(120);
    
    const command = hook.hooks.PreToolUse?.[0].hooks[0].command;
    expect(command).toContain('echo test');
    expect(command).toContain('60');
  });

  it('should throw error for non-positive debounce seconds', () => {
    expect(() => createDebouncedHook('echo test', 0)).toThrow('Debounce seconds must be positive');
    expect(() => createDebouncedHook('echo test', -5)).toThrow('Debounce seconds must be positive');
  });
});