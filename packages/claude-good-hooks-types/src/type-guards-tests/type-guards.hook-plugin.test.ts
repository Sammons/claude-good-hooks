import { describe, it, expect } from 'vitest';
import { isHookPlugin, type HookPlugin } from '../index.js';

/**
 * Type Guards Tests - isHookPlugin
 */

describe('Type Guards - isHookPlugin', () => {
  it('should validate correct HookPlugin objects', () => {
    const validPlugins: HookPlugin[] = [
      {
        name: 'test-plugin',
        description: 'A test plugin',
        version: '1.0.0',
        makeHook: () => ({}),
      },
      {
        name: 'complex-plugin',
        description: 'A more complex plugin',
        version: '2.1.0-beta.1',
        customArgs: {
          stringArg: {
            description: 'A string argument',
            type: 'string',
            default: 'default',
            required: true,
          },
          booleanArg: {
            description: 'A boolean argument',
            type: 'boolean',
          },
          numberArg: {
            description: 'A number argument',
            type: 'number',
            default: 42,
            required: false,
          },
        },
        makeHook: args => ({
          PreToolUse: [
            {
              hooks: [{ type: 'command', command: args.stringArg || 'default' }],
            },
          ],
        }),
      },
    ];

    validPlugins.forEach(plugin => {
      expect(isHookPlugin(plugin)).toBe(true);
    });
  });

  it('should reject invalid HookPlugin objects', () => {
    const invalidPlugins = [
      null,
      undefined,
      {},
      { name: 'test' }, // missing required fields
      { name: 'test', description: 'desc' }, // missing version and makeHook
      { name: 'test', description: 'desc', version: '1.0.0' }, // missing makeHook
      { name: 123, description: 'desc', version: '1.0.0', makeHook: () => ({}) }, // name not string
      { name: 'test', description: 123, version: '1.0.0', makeHook: () => ({}) }, // description not string
      { name: 'test', description: 'desc', version: 123, makeHook: () => ({}) }, // version not string
      { name: 'test', description: 'desc', version: '1.0.0', makeHook: 'not a function' },
      {
        name: 'test',
        description: 'desc',
        version: '1.0.0',
        makeHook: () => ({}),
        customArgs: 'invalid', // customArgs not object
      },
      {
        name: 'test',
        description: 'desc',
        version: '1.0.0',
        makeHook: () => ({}),
        customArgs: {
          invalidArg: 'not valid arg definition',
        },
      },
    ];

    invalidPlugins.forEach(plugin => {
      expect(isHookPlugin(plugin)).toBe(false);
    });
  });

  it('should validate customArgs structure', () => {
    // Valid customArgs
    const validCustomArgs = {
      stringArg: {
        description: 'String argument',
        type: 'string',
        default: 'default',
        required: true,
      },
      booleanArg: {
        description: 'Boolean argument',
        type: 'boolean',
        required: false,
      },
      numberArg: {
        description: 'Number argument',
        type: 'number',
      },
    };

    expect(
      isHookPlugin({
        name: 'test',
        description: 'test',
        version: '1.0.0',
        customArgs: validCustomArgs,
        makeHook: () => ({}),
      })
    ).toBe(true);

    // Invalid customArgs
    const invalidCustomArgsVariations = [
      {
        invalidArg: {
          description: 'Invalid type',
          type: 'invalid-type', // not string|boolean|number
        },
      },
      {
        missingDescription: {
          type: 'string',
        },
      },
      {
        missingType: {
          description: 'Missing type',
        },
      },
      {
        invalidRequired: {
          description: 'Invalid required',
          type: 'string',
          required: 'not a boolean',
        },
      },
    ];

    invalidCustomArgsVariations.forEach(customArgs => {
      expect(
        isHookPlugin({
          name: 'test',
          description: 'test',
          version: '1.0.0',
          customArgs,
          makeHook: () => ({}),
        })
      ).toBe(false);
    });
  });
});
