import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookConfiguration } from '../index.js';

/**
 * Hook Configuration Matcher Patterns Tests
 */

describe('HookConfiguration - Matcher Patterns', () => {
  it('should support exact tool name matching', () => {
    const exactMatch: HookConfiguration = {
      matcher: 'Write',
      hooks: [{ type: 'command', command: 'format-file' }],
    };

    expect(exactMatch.matcher).toBe('Write');
  });

  it('should support pipe-separated alternatives', () => {
    const alternatives: HookConfiguration = {
      matcher: 'Write|Edit|MultiEdit',
      hooks: [{ type: 'command', command: 'validate-changes' }],
    };

    expect(alternatives.matcher).toBe('Write|Edit|MultiEdit');
  });

  it('should support wildcard patterns', () => {
    const patterns = [
      '*',
      'Notebook.*',
      '.*Edit.*',
      'mcp__.*',
      'mcp__.*__write.*',
      '(Read|Write).*',
    ];

    patterns.forEach((pattern) => {
      const config: HookConfiguration = {
        matcher: pattern,
        hooks: [{ type: 'command', command: 'pattern-handler' }],
      };

      expect(config.matcher).toBe(pattern);
      expectTypeOf(config.matcher).toEqualTypeOf<string | undefined>();
    });
  });

  it('should handle complex regex-style patterns', () => {
    const complexPatterns = [
      '^(Write|Edit)$',
      'Bash\\(git.*\\)',
      '(?!Read).*',
      'Tool[A-Z].*',
      'mcp__[a-z]+__.*',
    ];

    complexPatterns.forEach((pattern) => {
      const config: HookConfiguration = {
        matcher: pattern,
        hooks: [{ type: 'command', command: 'complex-handler' }],
      };

      expect(config.matcher).toBe(pattern);
    });
  });

  it('should support empty string matcher', () => {
    const emptyMatcher: HookConfiguration = {
      matcher: '',
      hooks: [{ type: 'command', command: 'empty-matcher-handler' }],
    };

    expect(emptyMatcher.matcher).toBe('');
  });
});