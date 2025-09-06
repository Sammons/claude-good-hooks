import { describe, it, expect } from 'vitest';
import {
  createHookCommand,
  createHookConfiguration,
  createHookPlugin,
  createFileWatcherHook,
  createLinterHook,
  createTestRunnerHook,
  createNotificationHook,
  createConditionalHook,
  type HookEventType,
} from './index.js';

describe('index exports', () => {
  it('should export all core factory functions', () => {
    expect(createHookCommand).toBeDefined();
    expect(typeof createHookCommand).toBe('function');
    
    expect(createHookConfiguration).toBeDefined();
    expect(typeof createHookConfiguration).toBe('function');
    
    expect(createHookPlugin).toBeDefined();
    expect(typeof createHookPlugin).toBe('function');
  });

  it('should export all pattern helper functions', () => {
    expect(createFileWatcherHook).toBeDefined();
    expect(typeof createFileWatcherHook).toBe('function');
    
    expect(createLinterHook).toBeDefined();
    expect(typeof createLinterHook).toBe('function');
    
    expect(createTestRunnerHook).toBeDefined();
    expect(typeof createTestRunnerHook).toBe('function');
    
    expect(createNotificationHook).toBeDefined();
    expect(typeof createNotificationHook).toBe('function');
    
    expect(createConditionalHook).toBeDefined();
    expect(typeof createConditionalHook).toBe('function');
  });

  it('should export HookEventType', () => {
    // Test that the type exists by using it
    const eventType: HookEventType = 'PostToolUse';
    expect(eventType).toBe('PostToolUse');
  });

  it('should provide working factory functions', () => {
    // Integration test - create a complete hook using exported functions
    const command = createHookCommand('echo test');
    const config = createHookConfiguration([command], { matcher: 'Write' });
    const plugin = createHookPlugin(
      'test-hook',
      'Test hook for integration test',
      '1.0.0',
      () => ({ PostToolUse: [config] })
    );

    expect(command.type).toBe('command');
    expect(config.matcher).toBe('Write');
    expect(plugin.name).toBe('test-hook');
  });
});

describe('pattern helpers integration', () => {
  it('should create file watcher hook', () => {
    const hook = createFileWatcherHook(
      'file-watcher',
      'Watches files for changes',
      '1.0.0',
      { command: 'npm run build' }
    );

    expect(hook.name).toBe('file-watcher');
    expect(hook.description).toBe('Watches files for changes');
    expect(hook.version).toBe('1.0.0');
    expect(typeof hook.makeHook).toBe('function');

    // Test the generated hook configuration
    const config = hook.makeHook({});
    expect(config.PostToolUse).toBeDefined();
    expect(config.PostToolUse![0].matcher).toBe('Write|Edit');
    expect(config.PostToolUse![0].hooks[0].command).toBe('npm run build');
  });

  it('should create linter hook', () => {
    const hook = createLinterHook(
      'eslint-hook',
      'Runs ESLint on file changes',
      '1.0.0',
      { lintCommand: 'npx eslint .', autoFix: true }
    );

    expect(hook.name).toBe('eslint-hook');
    expect(hook.customArgs?.autoFix).toBeDefined();

    // Test with autoFix enabled
    const config = hook.makeHook({ autoFix: true });
    expect(config.PostToolUse![0].hooks[0].command).toContain('npx eslint . --fix');
  });

  it('should create test runner hook', () => {
    const hook = createTestRunnerHook(
      'jest-hook',
      'Runs Jest tests',
      '1.0.0',
      { testCommand: 'npm test', onlyChanged: true }
    );

    expect(hook.name).toBe('jest-hook');
    expect(hook.customArgs?.onlyChanged).toBeDefined();

    // Test with onlyChanged enabled
    const config = hook.makeHook({ onlyChanged: true });
    expect(config.PostToolUse![0].hooks[0].command).toContain('npm test --onlyChanged');
  });

  it('should create notification hook', () => {
    const hook = createNotificationHook(
      'notifier',
      'Shows notifications',
      '1.0.0',
      { message: 'Build completed!' }
    );

    expect(hook.name).toBe('notifier');
    expect(hook.customArgs?.message).toBeDefined();

    // Test the generated hook configuration
    const config = hook.makeHook({});
    expect(config.PostToolUse).toBeDefined();
    expect(config.PostToolUse![0].hooks[0].command).toContain('Build completed!');
  });

  it('should create conditional hook', () => {
    const hook = createConditionalHook(
      'conditional-hook',
      'Runs commands conditionally',
      '1.0.0',
      'test -f package.json',
      'npm install',
      'echo "No package.json found"'
    );

    expect(hook.name).toBe('conditional-hook');
    expect(hook.customArgs?.condition).toBeDefined();
    expect(hook.customArgs?.trueCommand).toBeDefined();
    expect(hook.customArgs?.falseCommand).toBeDefined();

    // Test the generated hook configuration
    const config = hook.makeHook({});
    expect(config.PostToolUse).toBeDefined();
    expect(config.PostToolUse![0].hooks[0].command).toContain('if test -f package.json');
    expect(config.PostToolUse![0].hooks[0].command).toContain('then npm install');
    expect(config.PostToolUse![0].hooks[0].command).toContain('else echo "No package.json found"');
  });
});