/**
 * Hook execution context for debugging
 */
export interface HookExecutionContext {
  hookName: string;
  eventType: string;
  timestamp: Date;
  executionId: string;
  sessionId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}