/**
 * Hook chain configuration for sequential execution
 */
export interface HookChain {
  name: string;
  description: string;
  steps: Array<{
    hookName: string;
    args?: Record<string, unknown>;
    condition?: string;
    onError?: 'continue' | 'stop' | 'retry';
    retryCount?: number;
  }>;
  parallel?: boolean;
  timeout?: number;
}
