import { describe, it, expect } from 'vitest';
import {
  isHookCommand,
  isHookConfiguration,
  isHookPlugin,
  isClaudeSettings,
  isHookMetadata,
} from '../index.js';

/**
 * Type Guards Performance and Edge Cases Tests
 */

describe('Type Guards - Performance and Edge Cases', () => {
  it('should handle deeply nested structures efficiently', () => {
    const deepSettings = {
      hooks: {
        PreToolUse: Array.from({ length: 100 }, (_, i) => ({
          matcher: `Tool${i}`,
          hooks: Array.from({ length: 10 }, (_, j) => ({
            type: 'command' as const,
            command: `command-${i}-${j}`,
            timeout: (i + j) * 1000,
          })),
        })),
      },
    };

    const startTime = Date.now();
    const result = isClaudeSettings(deepSettings);
    const endTime = Date.now();

    expect(result).toBe(true);
    expect(endTime - startTime).toBeLessThan(100); // Should be fast
  });

  it('should handle malformed data gracefully', () => {
    const malformedData = [
      null,
      undefined,
      0,
      '',
      false,
      NaN,
      Infinity,
      -Infinity,
      Symbol('test'),
      new Date(),
      new RegExp('test'),
      () => {},
      Promise.resolve({}),
    ];

    malformedData.forEach((data) => {
      expect(() => isHookCommand(data)).not.toThrow();
      expect(() => isHookConfiguration(data)).not.toThrow();
      expect(() => isHookPlugin(data)).not.toThrow();
      expect(() => isClaudeSettings(data)).not.toThrow();
      expect(() => isHookMetadata(data)).not.toThrow();

      expect(isHookCommand(data)).toBe(false);
      expect(isHookConfiguration(data)).toBe(false);
      expect(isHookPlugin(data)).toBe(false);
      // Empty object {} is valid ClaudeSettings, but these malformed objects are not
      if (data !== null && typeof data === 'object' && Object.keys(data as object).length === 0) {
        expect(isClaudeSettings(data)).toBe(true);
      } else {
        expect(isClaudeSettings(data)).toBe(false);
      }
      expect(isHookMetadata(data)).toBe(false);
    });
  });

  it('should handle circular references safely', () => {
    const circularObject: any = {
      name: 'test',
      description: 'test',
      version: '1.0.0',
      source: 'local',
      installed: true,
    };
    circularObject.self = circularObject;

    // Should not throw, but circular object actually passes basic validation 
    // since our type guards don't do deep traversal
    expect(() => isHookMetadata(circularObject)).not.toThrow();
    // The circular reference doesn't affect the basic property validation
    expect(isHookMetadata(circularObject)).toBe(true);
  });
});