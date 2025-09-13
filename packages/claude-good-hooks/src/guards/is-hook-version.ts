import type { HookVersion } from '../types/hooks/hook-version.js';

export function isHookVersion(obj: unknown): obj is HookVersion {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'major' in obj &&
    typeof obj.major === 'number' &&
    'minor' in obj &&
    typeof obj.minor === 'number' &&
    'patch' in obj &&
    typeof obj.patch === 'number' &&
    (!('prerelease' in obj) || typeof obj.prerelease === 'string') &&
    (!('build' in obj) || typeof obj.build === 'string')
  );
}
