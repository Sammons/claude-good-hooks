import { describe, it, expect } from 'vitest';
import { typedEntries } from './keys.js';

describe('typedEntries', () => {
  it('should return properly typed entries for an object', () => {
    const obj = {
      foo: 'bar',
      baz: 42,
      qux: true,
    };

    const entries = typedEntries(obj);

    expect(entries).toEqual([
      ['foo', 'bar'],
      ['baz', 42],
      ['qux', true],
    ]);
  });

  it('should handle empty objects', () => {
    const obj = {};
    const entries = typedEntries(obj);
    expect(entries).toEqual([]);
  });

  it('should preserve key types in TypeScript', () => {
    type TestObj = {
      specificKey: string;
      anotherKey: number;
    };

    const obj: TestObj = {
      specificKey: 'value',
      anotherKey: 123,
    };

    const entries = typedEntries(obj);

    // TypeScript should know that entries is Array<['specificKey', string] | ['anotherKey', number]>
    entries.forEach(([key, value]) => {
      if (key === 'specificKey') {
        expect(typeof value).toBe('string');
      } else if (key === 'anotherKey') {
        expect(typeof value).toBe('number');
      }
    });
  });
});
