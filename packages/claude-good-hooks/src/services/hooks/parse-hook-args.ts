/**
 * Parse hook arguments from command line args based on plugin definition
 */

import type { HookPlugin } from '../../types/index.js';

// Type for parsed hook arguments based on plugin customArgs definition
type HookArgValue = string | number | boolean;
export type ParsedHookArgs = Record<string, HookArgValue>;

/**
 * Parse hook arguments from command line args
 */
export function parseHookArgs(args: string[], plugin: HookPlugin): ParsedHookArgs {
  const parsed: ParsedHookArgs = {};

  if (!plugin || !plugin.customArgs) {
    return parsed;
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg == null) {
      throw new Error('Unexpectedly nullish arg, this is a bug');
    }
    if (arg.startsWith('--')) {
      const argName = arg.slice(2);
      const argDef = plugin.customArgs[argName];

      if (argDef) {
        if (argDef.type === 'boolean') {
          parsed[argName] = true;
        } else {
          const nextArg = args[i + 1];
          if (nextArg && !nextArg.startsWith('--')) {
            if (argDef.type === 'number') {
              const numValue = parseFloat(nextArg);
              if (!isNaN(numValue)) {
                parsed[argName] = numValue;
              }
            } else {
              parsed[argName] = nextArg;
            }
            i++;
          }
        }
      }
    }
  }

  for (const [argName, argDef] of Object.entries(plugin.customArgs)) {
    if (!(argName in parsed) && argDef.default !== undefined) {
      // The default value from the plugin definition should match our expected types
      const defaultValue = argDef.default as HookArgValue;
      parsed[argName] = defaultValue;
    }
  }

  return parsed;
}
