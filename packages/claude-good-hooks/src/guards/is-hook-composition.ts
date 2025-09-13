import type { HookComposition } from '../types/hooks/hook-composition.js';

export function isHookComposition(obj: unknown): obj is HookComposition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'description' in obj &&
    typeof obj.description === 'string' &&
    'hooks' in obj &&
    Array.isArray(obj.hooks) &&
    obj.hooks.every(
      (hook: unknown) =>
        typeof hook === 'object' &&
        hook !== null &&
        'hookName' in hook &&
        typeof hook.hookName === 'string'
    )
  );
}