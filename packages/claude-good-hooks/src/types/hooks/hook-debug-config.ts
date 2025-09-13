/**
 * Debug configuration for hooks
 */
export interface HookDebugConfig {
  enabled: boolean;
  tracing?: boolean;
  profiling?: boolean;
  breakpoints?: string[];
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  outputFile?: string;
}
