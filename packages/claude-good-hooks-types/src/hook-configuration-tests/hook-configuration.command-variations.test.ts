import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookConfiguration } from '../index.js';

/**
 * Hook Configuration Command Variations Tests
 */

describe('HookConfiguration - Command Variations', () => {
  it('should support simple shell commands', () => {
    const simpleCommands: HookConfiguration = {
      hooks: [
        { type: 'command', command: 'ls -la' },
        { type: 'command', command: 'echo "hello world"' },
        { type: 'command', command: 'pwd' },
      ],
    };

    simpleCommands.hooks.forEach(hook => {
      expectTypeOf(hook.command).toEqualTypeOf<string>();
      expect(typeof hook.command).toBe('string');
    });
  });

  it('should support complex shell commands', () => {
    const complexCommands: HookConfiguration = {
      matcher: 'ComplexTool',
      hooks: [
        {
          type: 'command',
          command: 'find . -name "*.ts" -not -path "./node_modules/*" | xargs eslint',
        },
        {
          type: 'command',
          command: 'docker run --rm -v $(pwd):/app node:18 npm test',
        },
        {
          type: 'command',
          command: 'if [ -f package.json ]; then npm run build; fi',
          timeout: 120000,
        },
      ],
    };

    expect(complexCommands.hooks).toHaveLength(3);
    complexCommands.hooks.forEach(hook => {
      expect(hook.command.length).toBeGreaterThan(10);
    });
  });

  it('should support script file execution', () => {
    const scriptExecution: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: '$CLAUDE_PROJECT_DIR/.claude/hooks/validate.sh',
        },
        {
          type: 'command',
          command: '/usr/local/bin/custom-validator',
          timeout: 30000,
        },
        {
          type: 'command',
          command: 'python3 $CLAUDE_PROJECT_DIR/scripts/check.py',
        },
      ],
    };

    scriptExecution.hooks.forEach(hook => {
      expect(hook.command).toMatch(/\.(sh|py)$|validator$/);
    });
  });

  it('should support commands with environment variables', () => {
    const envCommands: HookConfiguration = {
      hooks: [
        {
          type: 'command',
          command: 'NODE_ENV=production npm run build',
        },
        {
          type: 'command',
          command: 'DEBUG=1 VERBOSE=true ./test-script.sh',
        },
        {
          type: 'command',
          command: 'export PATH=$PATH:/custom/bin && custom-tool',
        },
      ],
    };

    envCommands.hooks.forEach(hook => {
      expect(hook.command).toMatch(/[A-Z_]+=|export/);
    });
  });
});
