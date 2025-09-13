import type { HookExecutionResult } from '../types/hooks/hook-execution-result.js';
import { isHookExecutionContext } from './is-hook-execution-context.js';

export function isHookExecutionResult(obj: unknown): obj is HookExecutionResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'context' in obj &&
    isHookExecutionContext(obj.context) &&
    'success' in obj &&
    typeof obj.success === 'boolean' &&
    'duration' in obj &&
    typeof obj.duration === 'number'
  );
}
