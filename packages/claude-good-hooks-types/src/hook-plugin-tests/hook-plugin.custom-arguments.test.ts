import { describe, it, expect, expectTypeOf } from 'vitest';
import type { HookPlugin } from '../index.js';

/**
 * Hook Plugin Custom Arguments Tests
 */

describe('HookPlugin - Custom Arguments', () => {
  it('should support all argument types with all properties', () => {
    const plugin: HookPlugin = {
      name: 'comprehensive-args-plugin',
      description: 'Plugin testing all argument features',
      version: '1.0.0',
      customArgs: {
        stringParam: {
          description: 'A string parameter',
          type: 'string',
          default: 'default-value',
          required: true,
        },
        booleanParam: {
          description: 'A boolean parameter',
          type: 'boolean',
          default: false,
          required: false,
        },
        numberParam: {
          description: 'A numeric parameter',
          type: 'number',
          default: 42,
        },
        optionalString: {
          description: 'Optional string without default',
          type: 'string',
          required: false,
        },
        requiredNumber: {
          description: 'Required number without default',
          type: 'number',
          required: true,
        },
      },
      makeHook: () => ({}),
    };

    const customArgs = plugin.customArgs!;

    expect(customArgs.stringParam.type).toBe('string');
    expect(customArgs.stringParam.required).toBe(true);
    expect(customArgs.stringParam.default).toBe('default-value');

    expect(customArgs.booleanParam.type).toBe('boolean');
    expect(customArgs.booleanParam.required).toBe(false);
    expect(customArgs.booleanParam.default).toBe(false);

    expect(customArgs.numberParam.type).toBe('number');
    expect(customArgs.numberParam.default).toBe(42);
    expect(customArgs.numberParam.required).toBeUndefined();

    expect(customArgs.optionalString.required).toBe(false);
    expect(customArgs.optionalString.default).toBeUndefined();

    expect(customArgs.requiredNumber.required).toBe(true);
    expect(customArgs.requiredNumber.default).toBeUndefined();
  });

  it('should support minimal argument definitions', () => {
    const plugin: HookPlugin = {
      name: 'minimal-args-plugin',
      description: 'Plugin with minimal argument definitions',
      version: '1.0.0',
      customArgs: {
        simpleString: {
          description: 'Simple string argument',
          type: 'string',
        },
        simpleBoolean: {
          description: 'Simple boolean argument',
          type: 'boolean',
        },
        simpleNumber: {
          description: 'Simple number argument',
          type: 'number',
        },
      },
      makeHook: () => ({}),
    };

    const customArgs = plugin.customArgs!;

    Object.values(customArgs).forEach(arg => {
      expect(arg.description).toBeDefined();
      expect(['string', 'boolean', 'number']).toContain(arg.type);
      expect(arg.default).toBeUndefined();
      expect(arg.required).toBeUndefined();
    });
  });

  it('should support complex argument names and descriptions', () => {
    const plugin: HookPlugin = {
      name: 'complex-args-plugin',
      description: 'Plugin with complex argument definitions',
      version: '1.0.0',
      customArgs: {
        'kebab-case-arg': {
          description: 'Argument with kebab-case name',
          type: 'string',
        },
        snake_case_arg: {
          description: 'Argument with snake_case name',
          type: 'boolean',
        },
        camelCaseArg: {
          description: 'Argument with camelCase name',
          type: 'number',
        },
        'arg_with-mixed_CASE': {
          description:
            'A very detailed description that explains the purpose of this argument, its expected values, and how it affects the plugin behavior in various scenarios.',
          type: 'string',
          default: 'complex-default-value',
        },
      },
      makeHook: () => ({}),
    };

    const customArgs = plugin.customArgs!;
    expect(Object.keys(customArgs)).toHaveLength(4);
    expect(customArgs['kebab-case-arg']).toBeDefined();
    expect(customArgs.snake_case_arg).toBeDefined();
    expect(customArgs.camelCaseArg).toBeDefined();
    expect(customArgs['arg_with-mixed_CASE']).toBeDefined();
  });

  it('should support default values of various types', () => {
    const plugin: HookPlugin = {
      name: 'default-values-plugin',
      description: 'Plugin testing various default values',
      version: '1.0.0',
      customArgs: {
        stringWithString: {
          description: 'String with string default',
          type: 'string',
          default: 'string-default',
        },
        stringWithNumber: {
          description: 'String with number default (should be allowed)',
          type: 'string',
          default: 123,
        },
        booleanWithBoolean: {
          description: 'Boolean with boolean default',
          type: 'boolean',
          default: true,
        },
        booleanWithString: {
          description: 'Boolean with string default (should be allowed)',
          type: 'boolean',
          default: 'true',
        },
        numberWithNumber: {
          description: 'Number with number default',
          type: 'number',
          default: 3.14,
        },
        numberWithString: {
          description: 'Number with string default (should be allowed)',
          type: 'number',
          default: '42',
        },
        arrayDefault: {
          description: 'Argument with array default',
          type: 'string',
          default: ['a', 'b', 'c'],
        },
        objectDefault: {
          description: 'Argument with object default',
          type: 'string',
          default: { key: 'value' },
        },
        nullDefault: {
          description: 'Argument with null default',
          type: 'string',
          default: null,
        },
      },
      makeHook: () => ({}),
    };

    const customArgs = plugin.customArgs!;
    expect(customArgs.stringWithString.default).toBe('string-default');
    expect(customArgs.stringWithNumber.default).toBe(123);
    expect(customArgs.booleanWithBoolean.default).toBe(true);
    expect(customArgs.booleanWithString.default).toBe('true');
    expect(customArgs.numberWithNumber.default).toBe(3.14);
    expect(customArgs.numberWithString.default).toBe('42');
    expect(Array.isArray(customArgs.arrayDefault.default)).toBe(true);
    expect(typeof customArgs.objectDefault.default).toBe('object');
    expect(customArgs.nullDefault.default).toBe(null);
  });

  it('should handle plugins without custom arguments', () => {
    const plugin: HookPlugin = {
      name: 'no-args-plugin',
      description: 'Plugin without custom arguments',
      version: '1.0.0',
      makeHook: () => ({}),
    };

    expect(plugin.customArgs).toBeUndefined();
    expectTypeOf(plugin.customArgs).toEqualTypeOf<
      | Record<
          string,
          {
            description: string;
            type: 'string' | 'boolean' | 'number';
            default?: any;
            required?: boolean;
          }
        >
      | undefined
    >();
  });
});
