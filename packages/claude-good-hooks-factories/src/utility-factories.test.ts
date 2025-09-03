import { describe, it, expect, vi } from 'vitest';
import {
  createNotificationHook,
  createGitAutoCommitHook,
  createLintingHook,
  createTestingHook,
  createBuildHook,
  createFileBackupHook,
  createDevServerRestartHook,
  createDocumentationHook,
} from './utility-factories.js';

// Mock process.platform
const originalPlatform = process.platform;

describe('createNotificationHook', () => {
  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  it('should create macOS notification hook', () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
    });

    const hook = createNotificationHook('Test message');
    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;

    expect(command).toContain('osascript');
    expect(command).toContain('Test message');
  });

  it('should create Linux notification hook', () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });

    const hook = createNotificationHook('Test message');
    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;

    expect(command).toContain('notify-send');
    expect(command).toContain('Test message');
  });

  it('should create generic notification hook', () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });

    const hook = createNotificationHook('Test message');
    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;

    expect(command).toContain('echo');
    expect(command).toContain('Test message');
  });

  it('should use custom event type and matcher', () => {
    const hook = createNotificationHook('Test', 'PreToolUse', 'Write');

    expect(hook.hooks.PreToolUse?.[0].matcher).toBe('Write');
  });
});

describe('createGitAutoCommitHook', () => {
  it('should create git auto-commit hook with default message', () => {
    const hook = createGitAutoCommitHook();

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('Write|Edit');

    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('git status --porcelain');
    expect(command).toContain('git add . && git commit -m "Auto-commit changes"');
    expect(command).toContain('echo "No changes to commit"');
  });

  it('should create git auto-commit hook with custom message and matcher', () => {
    const hook = createGitAutoCommitHook('Custom commit', '*.ts');

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('*.ts');

    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('Custom commit');
  });
});

describe('createLintingHook', () => {
  it('should create basic linting hook', () => {
    const hook = createLintingHook();

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('Write|Edit');
    expect(hook.hooks.PostToolUse?.[0].hooks).toHaveLength(1);
    expect(hook.hooks.PostToolUse?.[0].hooks[0].command).toBe('npm run lint');
  });

  it('should create linting hook with auto-fix', () => {
    const hook = createLintingHook('eslint .', 'eslint . --fix');

    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('eslint .');
    expect(command).toContain('eslint . --fix');
  });

  it('should create linting hook with custom matcher', () => {
    const hook = createLintingHook('prettier --check .', undefined, '*.js');

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('*.js');
  });
});

describe('createTestingHook', () => {
  it('should create basic testing hook', () => {
    const hook = createTestingHook();

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('Write|Edit');
    expect(hook.hooks.PostToolUse?.[0].hooks[0].command).toBe('npm test');
  });

  it('should create testing hook for test files only', () => {
    const hook = createTestingHook('jest', 'Write|Edit', true);

    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('\\.(test|spec)\\.');
    expect(command).toContain('jest');
    expect(command).toContain('skipping tests');
  });

  it('should create testing hook with custom command', () => {
    const hook = createTestingHook('npm run test:unit');

    expect(hook.hooks.PostToolUse?.[0].hooks[0].command).toBe('npm run test:unit');
  });
});

describe('createBuildHook', () => {
  it('should create basic build hook', () => {
    const hook = createBuildHook();

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('Write|Edit');

    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('npm run build');
    expect(command).toContain('skipping build'); // Default behavior skips on test files
  });

  it('should create build hook that skips on test files', () => {
    const hook = createBuildHook('webpack', 'Write', true);

    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('\\.(test|spec)\\.');
    expect(command).toContain('webpack');
    expect(command).toContain('skipping build');
  });

  it('should create build hook that runs on all files', () => {
    const hook = createBuildHook('npm run build', 'Write', false);

    expect(hook.hooks.PostToolUse?.[0].hooks[0].command).toBe('npm run build');
  });
});

describe('createFileBackupHook', () => {
  it('should create file backup hook with default directory', () => {
    const hook = createFileBackupHook();

    expect(hook.hooks.PreToolUse?.[0].matcher).toBe('Write|Edit');

    const command = hook.hooks.PreToolUse?.[0].hooks[0].command;
    expect(command).toContain('.claude-backups');
    expect(command).toContain('mkdir -p');
    expect(command).toContain('$CLAUDE_FILE_PATH');
  });

  it('should create file backup hook with custom directory', () => {
    const hook = createFileBackupHook('./my-backups', 'Write');

    expect(hook.hooks.PreToolUse?.[0].matcher).toBe('Write');

    const command = hook.hooks.PreToolUse?.[0].hooks[0].command;
    expect(command).toContain('./my-backups');
  });
});

describe('createDevServerRestartHook', () => {
  it('should create dev server restart hook', () => {
    const hook = createDevServerRestartHook('npm run dev:restart');

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('Write|Edit');
    expect(hook.hooks.PostToolUse?.[0].hooks[0].command).toBe('npm run dev:restart');
  });

  it('should create dev server restart hook with PID file', () => {
    const hook = createDevServerRestartHook('npm run dev', '.server.pid', 'Write');

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('Write');

    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('.server.pid');
    expect(command).toContain('kill');
    expect(command).toContain('npm run dev');
  });
});

describe('createDocumentationHook', () => {
  it('should create documentation hook with default command', () => {
    const hook = createDocumentationHook();

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('Write|Edit');

    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('\\.(js|ts|jsx|tsx)$');
    expect(command).toContain('npm run docs');
    expect(command).toContain('skipping documentation generation');
  });

  it('should create documentation hook with custom command', () => {
    const hook = createDocumentationHook('typedoc src');

    const command = hook.hooks.PostToolUse?.[0].hooks[0].command;
    expect(command).toContain('typedoc src');
  });

  it('should create documentation hook with custom matcher', () => {
    const hook = createDocumentationHook('jsdoc', '*.js');

    expect(hook.hooks.PostToolUse?.[0].matcher).toBe('*.js');
  });
});
