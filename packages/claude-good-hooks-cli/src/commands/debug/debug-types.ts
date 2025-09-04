/**
 * Type definitions for debug command implementation
 */

export interface HookExecutionResult {
  success: boolean;
  duration: number;
  context: {
    hookName: string;
    executionId: string;
    timestamp: Date;
  };
  exitCode?: number;
  error?: string;
}

export interface HookDebugConfig {
  enabled: boolean;
  tracing: boolean;
  profiling: boolean;
  logLevel: string;
  outputFile?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface DebugOptions {
  help?: boolean;
  trace?: boolean;
  profile?: boolean;
  breakpoint?: boolean;
  report?: string;
  output?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  interactive?: boolean;
  json?: boolean;
}

export interface BreakpointConfig {
  condition?: string;
  interactive: boolean;
  timestamp: string;
}

export interface TracingHookConfig {
  name: string;
  description: string;
  traceLevel: 'basic' | 'detailed' | 'verbose';
  traceFile: string;
  includeEnvironment: boolean;
}

export interface ProfilingHookConfig {
  name: string;
  description: string;
  outputFormat: string;
  metricsFile: string;
  includeSystemMetrics: boolean;
}

export interface DebugExecutions {
  executions: HookExecutionResult[];
}

export interface DebugMetrics {
  memory?: number;
  cpu?: number;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Interface for debug sub-command implementations
 */
export interface DebugSubCommand {
  match(subcommand: string): boolean;
  execute(args: string[], options: DebugOptions): Promise<void>;
}