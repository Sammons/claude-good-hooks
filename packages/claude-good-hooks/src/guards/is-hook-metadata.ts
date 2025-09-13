import type { HookMetadata } from '../types/hooks/hook-metadata.js';
import { isHookConfiguration } from './is-hook-configuration.js';

export function isHookMetadata(obj: unknown): obj is HookMetadata {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'description' in obj &&
    typeof obj.description === 'string' &&
    'version' in obj &&
    typeof obj.version === 'string' &&
    'source' in obj &&
    ['local', 'global', 'remote'].includes(obj.source as string) &&
    'installed' in obj &&
    typeof obj.installed === 'boolean' &&
    (!('packageName' in obj) || typeof obj.packageName === 'string') &&
    (!('hookConfiguration' in obj) || isHookConfiguration(obj.hookConfiguration))
  );
}