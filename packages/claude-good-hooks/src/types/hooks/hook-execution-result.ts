import type { HookExecutionContext } from './hook-execution-context.js';

/**
 * Hook execution result with performance metrics
 */
export interface HookExecutionResult {
  context: HookExecutionContext;
  success: boolean;
  exitCode?: number;
  output?: string;
  error?: string;
  duration: number;
  memoryUsage?: number;
  cpuUsage?: number;
}
