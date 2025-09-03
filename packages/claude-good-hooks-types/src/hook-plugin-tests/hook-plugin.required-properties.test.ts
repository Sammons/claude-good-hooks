import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookPlugin } from '../index.js';

/**
 * Hook Plugin Required Properties Tests
 */

describe('HookPlugin - Required Properties', () => {
  it('should enforce all required string properties', () => {
    const plugin: HookPlugin = {
      name: 'test-plugin',
      description: 'A comprehensive test plugin',
      version: '1.0.0',
      makeHook: () => ({}),
    };

    expectTypeOf(plugin.name).toEqualTypeOf<string>();
    expectTypeOf(plugin.description).toEqualTypeOf<string>();
    expectTypeOf(plugin.version).toEqualTypeOf<string>();
    expectTypeOf(plugin.makeHook).toMatchTypeOf<(args: Record<string, any>) => any>();

    expect(typeof plugin.name).toBe('string');
    expect(typeof plugin.description).toBe('string');
    expect(typeof plugin.version).toBe('string');
    expect(typeof plugin.makeHook).toBe('function');
  });

  it('should accept various name patterns', () => {
    const namePatterns = [
      'simple-plugin',
      'my_plugin',
      'MyPlugin',
      'plugin123',
      'namespaced/plugin',
      '@scope/plugin-name',
      'very-long-plugin-name-with-multiple-hyphens',
    ];

    namePatterns.forEach((name) => {
      const plugin: HookPlugin = {
        name,
        description: 'Test plugin',
        version: '1.0.0',
        makeHook: () => ({}),
      };

      expect(plugin.name).toBe(name);
    });
  });

  it('should accept various description lengths', () => {
    const descriptions = [
      'Short',
      'Medium length description',
      'A very detailed and comprehensive description that explains exactly what this plugin does, how it works, and when it should be used in various development scenarios.',
      '', // Empty description
    ];

    descriptions.forEach((description) => {
      const plugin: HookPlugin = {
        name: 'test-plugin',
        description,
        version: '1.0.0',
        makeHook: () => ({}),
      };

      expect(plugin.description).toBe(description);
    });
  });

  it('should accept various version formats', () => {
    const versions = [
      '1.0.0',
      '0.1.0',
      '10.20.30',
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-beta.2',
      '1.0.0-rc.1',
      '2.0.0-next.3',
      'v1.0.0',
      '1.0',
      'latest',
      'dev',
      '2023.12.25',
    ];

    versions.forEach((version) => {
      const plugin: HookPlugin = {
        name: 'version-test-plugin',
        description: 'Testing version formats',
        version,
        makeHook: () => ({}),
      };

      expect(plugin.version).toBe(version);
    });
  });
});