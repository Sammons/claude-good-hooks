import type { HookCommand } from '../types/hooks/hook-command.js';

export function isHookCommand(obj: unknown): obj is HookCommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    obj.type === 'command' &&
    'command' in obj &&
    typeof obj.command === 'string' &&
    (!('timeout' in obj) || obj.timeout === undefined || typeof obj.timeout === 'number') &&
    (!('enabled' in obj) || obj.enabled === undefined || typeof obj.enabled === 'boolean') &&
    (!('continueOnError' in obj) ||
      obj.continueOnError === undefined ||
      typeof obj.continueOnError === 'boolean')
  );
}
