import type { HookExecutionContext } from '../types/hooks/hook-execution-context.js';

export function isHookExecutionContext(obj: unknown): obj is HookExecutionContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hookName' in obj &&
    typeof obj.hookName === 'string' &&
    'eventType' in obj &&
    typeof obj.eventType === 'string' &&
    'timestamp' in obj &&
    obj.timestamp instanceof Date &&
    'executionId' in obj &&
    typeof obj.executionId === 'string'
  );
}
