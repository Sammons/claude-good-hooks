import { describe, it, expect } from 'vitest';
import { isHookCommand, type HookCommand } from '../index.js';

/**
 * Type Guards Tests - isHookCommand
 */

describe('Type Guards - isHookCommand', () => {
  it('should validate correct HookCommand objects', () => {
    const validCommands: HookCommand[] = [
      {
        type: 'command',
        command: 'echo "test"',
      },
      {
        type: 'command',
        command: 'npm run build',
        timeout: 30000,
      },
      {
        type: 'command',
        command: 'very-long-command-with-many-arguments --flag1 --flag2 value',
        timeout: 0,
      },
    ];

    validCommands.forEach(cmd => {
      expect(isHookCommand(cmd)).toBe(true);
    });
  });

  it('should reject invalid HookCommand objects', () => {
    const invalidCommands = [
      null,
      undefined,
      {},
      { type: 'invalid', command: 'test' },
      { type: 'command' }, // missing command
      { command: 'test' }, // missing type
      { type: 'command', command: 123 }, // command not string
      { type: 'command', command: 'test', timeout: 'invalid' }, // timeout not number
      { type: 'command', command: '', timeout: null }, // timeout null
      'not an object',
      123,
      [],
      false,
    ];

    invalidCommands.forEach(cmd => {
      expect(isHookCommand(cmd)).toBe(false);
    });
  });

  it('should handle edge cases', () => {
    // Empty string command should be valid
    expect(
      isHookCommand({
        type: 'command',
        command: '',
      })
    ).toBe(true);

    // Zero timeout should be valid
    expect(
      isHookCommand({
        type: 'command',
        command: 'test',
        timeout: 0,
      })
    ).toBe(true);

    // Negative timeout should be valid (implementation allows it)
    expect(
      isHookCommand({
        type: 'command',
        command: 'test',
        timeout: -1,
      })
    ).toBe(true);

    // Very large timeout should be valid
    expect(
      isHookCommand({
        type: 'command',
        command: 'test',
        timeout: Number.MAX_SAFE_INTEGER,
      })
    ).toBe(true);

    // Extra properties should not affect validation
    expect(
      isHookCommand({
        type: 'command',
        command: 'test',
        extraProperty: 'ignored',
      })
    ).toBe(true);
  });
});
