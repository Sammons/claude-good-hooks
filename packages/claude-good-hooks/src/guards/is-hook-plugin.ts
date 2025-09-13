import type { HookPlugin } from '../types/hooks/hook-plugin.js';

function isCustomArgsValid(customArgs: unknown): boolean {
  if (typeof customArgs !== 'object' || customArgs === null) {
    return false;
  }

  for (const [key, value] of Object.entries(customArgs)) {
    if (typeof key !== 'string' || !isCustomArgValid(value)) {
      return false;
    }
  }

  return true;
}

function isCustomArgValid(arg: unknown): boolean {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    'description' in arg &&
    typeof arg.description === 'string' &&
    'type' in arg &&
    ['string', 'boolean', 'number'].includes(arg.type as string) &&
    (!('required' in arg) || typeof arg.required === 'boolean')
  );
}

export function isHookPlugin(obj: unknown): obj is HookPlugin {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'description' in obj &&
    typeof obj.description === 'string' &&
    'version' in obj &&
    typeof obj.version === 'string' &&
    'makeHook' in obj &&
    typeof obj.makeHook === 'function' &&
    (!('customArgs' in obj) || isCustomArgsValid(obj.customArgs))
  );
}
