import type { HookDependency } from '../types/hooks/hook-dependency.js';

export function isHookDependency(obj: unknown): obj is HookDependency {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'version' in obj &&
    typeof obj.version === 'string' &&
    (!('optional' in obj) || typeof obj.optional === 'boolean')
  );
}
