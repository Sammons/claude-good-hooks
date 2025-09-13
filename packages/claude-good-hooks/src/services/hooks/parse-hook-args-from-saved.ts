/**
 * Parse hook arguments from saved metadata for regeneration
 */

import type { HookPlugin } from '../../types/index.js';

type HookArgValue = string | number | boolean;
export type ParsedHookArgs = Record<string, HookArgValue>;

/**
 * Parse hook arguments from saved metadata
 */
export function parseHookArgsFromSaved(
  savedArgs: Record<string, unknown>,
  plugin: HookPlugin
): ParsedHookArgs {
  const parsed: ParsedHookArgs = {};

  // the plugin doesn't require any args
  if (!plugin.customArgs) {
    return parsed;
  }

  // Start with saved arguments
  for (const [argName, value] of Object.entries(savedArgs)) {
    if (argName in plugin.customArgs) {
      const argDef = plugin.customArgs[argName];
      if (!argDef) {
        throw new Error(
          `Unexpectedly missing argDef for ${argName} for plugin ${plugin.name}. This is a bug.`
        );
      }

      // Validate and convert the saved value based on current plugin definition
      if (argDef.type === 'boolean' && typeof value === 'boolean') {
        parsed[argName] = value;
      } else if (argDef.type === 'number' && typeof value === 'number') {
        parsed[argName] = value;
      } else if (argDef.type === 'string' && typeof value === 'string') {
        parsed[argName] = value;
      } else if (value !== null && value !== undefined) {
        // Try to convert the value to the expected type
        if (argDef.type === 'number') {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            parsed[argName] = numValue;
          }
        } else if (argDef.type === 'boolean') {
          parsed[argName] = Boolean(value);
        } else {
          parsed[argName] = String(value);
        }
      }
    }
  }

  // Add default values for any missing arguments
  for (const [argName, argDef] of Object.entries(plugin.customArgs)) {
    if (!(argName in parsed) && argDef.default !== undefined) {
      const defaultValue = argDef.default as HookArgValue;
      parsed[argName] = defaultValue;
    }
  }

  return parsed;
}
