/**
 * Debug and Profiling Factories
 *
 * Utilities for debugging hooks, performance profiling,
 * execution tracing, and error diagnosis.
 */

import type {
  HookCommand,
  HookConfiguration,
  HookPlugin,
  HookExecutionResult,
  HookDebugConfig,
  EnhancedHookPlugin,
} from '@sammons/claude-good-hooks-types';

/**
 * Creates a debug wrapper around an existing hook for execution tracing
 *
 * @param plugin - Original hook plugin to debug
 * @param debugConfig - Debug configuration options
 * @returns Enhanced hook plugin with debug capabilities
 *
 * @example
 * ```typescript
 * import { createDebugHook } from '@sammons/claude-good-hooks-factories';
 *
 * const debuggedHook = createDebugHook(originalHook, {
 *   enabled: true,
 *   tracing: true,
 *   profiling: true,
 *   logLevel: 'debug',
 *   outputFile: '/tmp/hook-debug.log'
 * });
 * ```
 */
export function createDebugHook(
  plugin: HookPlugin,
  debugConfig: HookDebugConfig
): EnhancedHookPlugin {
  if (!debugConfig.enabled) {
    return plugin as EnhancedHookPlugin;
  }

  return {
    ...plugin,
    debug: debugConfig,
    makeHook: (args: Record<string, any>) => {
      const originalHooks = plugin.makeHook(args);
      const debuggedHooks: any = {};

      // Wrap each hook configuration with debug instrumentation
      for (const [eventType, configurations] of Object.entries(originalHooks)) {
        debuggedHooks[eventType] = configurations.map((config: HookConfiguration) => ({
          ...config,
          hooks: config.hooks.map(hook => wrapCommandWithDebug(hook, debugConfig, plugin.name)),
        }));
      }

      return debuggedHooks;
    },
  };
}

/**
 * Creates a performance profiling hook that measures execution metrics
 *
 * @param options - Profiling configuration
 * @returns Hook plugin that profiles other hooks
 *
 * @example
 * ```typescript
 * import { createProfilingHook } from '@sammons/claude-good-hooks-factories';
 *
 * const profiler = createProfilingHook({
 *   name: 'performance-profiler',
 *   description: 'Profile hook execution performance',
 *   outputFormat: 'json',
 *   metricsFile: '/tmp/hook-metrics.json'
 * });
 * ```
 */
export function createProfilingHook(options: {
  name: string;
  description: string;
  outputFormat?: 'json' | 'csv' | 'text';
  metricsFile?: string;
  includeSystemMetrics?: boolean;
}): HookPlugin {
  return {
    name: options.name,
    description: options.description,
    version: '1.0.0',
    makeHook: () => ({
      PreToolUse: [
        {
          hooks: [
            {
              type: 'command',
              command: generateProfilingCommand('start', options),
            },
          ],
        },
      ],
      PostToolUse: [
        {
          hooks: [
            {
              type: 'command',
              command: generateProfilingCommand('end', options),
            },
          ],
        },
      ],
    }),
  };
}

/**
 * Creates a tracing hook that logs detailed execution information
 *
 * @param options - Tracing configuration
 * @returns Hook plugin for execution tracing
 *
 * @example
 * ```typescript
 * import { createTracingHook } from '@sammons/claude-good-hooks-factories';
 *
 * const tracer = createTracingHook({
 *   name: 'execution-tracer',
 *   description: 'Trace hook execution flow',
 *   traceLevel: 'detailed',
 *   includeEnvironment: true
 * });
 * ```
 */
export function createTracingHook(options: {
  name: string;
  description: string;
  traceLevel?: 'basic' | 'detailed' | 'verbose';
  includeEnvironment?: boolean;
  traceFile?: string;
}): HookPlugin {
  return {
    name: options.name,
    description: options.description,
    version: '1.0.0',
    makeHook: () => {
      const traceCommand = generateTracingCommand(options);

      return {
        PreToolUse: [
          {
            hooks: [{ type: 'command', command: `${traceCommand} PRE_TOOL_USE` }],
          },
        ],
        PostToolUse: [
          {
            hooks: [{ type: 'command', command: `${traceCommand} POST_TOOL_USE` }],
          },
        ],
        UserPromptSubmit: [
          {
            hooks: [{ type: 'command', command: `${traceCommand} USER_PROMPT_SUBMIT` }],
          },
        ],
        SessionStart: [
          {
            hooks: [{ type: 'command', command: `${traceCommand} SESSION_START` }],
          },
        ],
        SessionEnd: [
          {
            hooks: [{ type: 'command', command: `${traceCommand} SESSION_END` }],
          },
        ],
      };
    },
  };
}

/**
 * Creates a breakpoint hook that pauses execution for inspection
 *
 * @param options - Breakpoint configuration
 * @returns Hook plugin with breakpoint capabilities
 *
 * @example
 * ```typescript
 * import { createBreakpointHook } from '@sammons/claude-good-hooks-factories';
 *
 * const breakpoint = createBreakpointHook({
 *   name: 'debug-breakpoint',
 *   description: 'Pause execution for debugging',
 *   condition: 'file.endsWith(".ts")',
 *   interactive: true
 * });
 * ```
 */
export function createBreakpointHook(options: {
  name: string;
  description: string;
  condition?: string;
  interactive?: boolean;
  timeout?: number;
}): HookPlugin {
  return {
    name: options.name,
    description: options.description,
    version: '1.0.0',
    makeHook: () => ({
      PreToolUse: [
        {
          hooks: [
            {
              type: 'command',
              command: generateBreakpointCommand(options),
              ...(options.timeout && {
                timeout: options.timeout,
              }),
            },
          ],
        },
      ],
    }),
  };
}

/**
 * Creates an error diagnosis hook that analyzes failures
 *
 * @param options - Error diagnosis configuration
 * @returns Hook plugin for error analysis
 *
 * @example
 * ```typescript
 * import { createErrorDiagnosisHook } from '@sammons/claude-good-hooks-factories';
 *
 * const diagnosis = createErrorDiagnosisHook({
 *   name: 'error-analyzer',
 *   description: 'Analyze and categorize hook failures',
 *   analyzeStackTrace: true,
 *   suggestFixes: true
 * });
 * ```
 */
export function createErrorDiagnosisHook(options: {
  name: string;
  description: string;
  analyzeStackTrace?: boolean;
  suggestFixes?: boolean;
  reportFile?: string;
}): HookPlugin {
  return {
    name: options.name,
    description: options.description,
    version: '1.0.0',
    makeHook: () => ({
      PostToolUse: [
        {
          hooks: [
            {
              type: 'command',
              command: generateErrorAnalysisCommand(options),
            },
          ],
        },
      ],
    }),
  };
}

/**
 * Generates a comprehensive debug report for a hook execution
 *
 * @param result - Hook execution result
 * @param context - Additional context information
 * @returns Formatted debug report
 *
 * @example
 * ```typescript
 * import { generateDebugReport } from '@sammons/claude-good-hooks-factories';
 *
 * const report = generateDebugReport(executionResult, {
 *   includeEnvironment: true,
 *   includeMetrics: true
 * });
 * ```
 */
export function generateDebugReport(
  result: HookExecutionResult,
  context?: {
    includeEnvironment?: boolean;
    includeMetrics?: boolean;
    includeStackTrace?: boolean;
  }
): string {
  let report = '🔍 Hook Debug Report\n';
  report += '='.repeat(50) + '\n\n';

  // Basic execution info
  report += `📋 Execution Details:\n`;
  report += `   Hook: ${result.context.hookName}\n`;
  report += `   Event: ${result.context.eventType}\n`;
  report += `   Execution ID: ${result.context.executionId}\n`;
  report += `   Timestamp: ${result.context.timestamp.toISOString()}\n`;
  report += `   Success: ${result.success ? '✅' : '❌'}\n`;
  report += `   Duration: ${result.duration}ms\n`;

  if (result.exitCode !== undefined) {
    report += `   Exit Code: ${result.exitCode}\n`;
  }

  report += '\n';

  // Performance metrics
  if (context?.includeMetrics && (result.memoryUsage || result.cpuUsage)) {
    report += `⚡ Performance Metrics:\n`;
    if (result.memoryUsage) {
      report += `   Memory Usage: ${formatBytes(result.memoryUsage)}\n`;
    }
    if (result.cpuUsage) {
      report += `   CPU Usage: ${result.cpuUsage.toFixed(2)}%\n`;
    }
    report += '\n';
  }

  // Output and errors
  if (result.output) {
    report += `📤 Output:\n`;
    report += `${result.output}\n\n`;
  }

  if (result.error) {
    report += `❌ Error:\n`;
    report += `${result.error}\n\n`;
  }

  // Environment information
  if (context?.includeEnvironment) {
    report += `🌍 Environment:\n`;
    report += `   Node Version: ${process.version}\n`;
    report += `   Platform: ${process.platform}\n`;
    report += `   Architecture: ${process.arch}\n`;
    report += `   Working Directory: ${process.cwd()}\n`;
    report += '\n';
  }

  // Context metadata
  if (result.context.args && Object.keys(result.context.args).length > 0) {
    report += `⚙️  Arguments:\n`;
    for (const [key, value] of Object.entries(result.context.args)) {
      report += `   ${key}: ${JSON.stringify(value)}\n`;
    }
    report += '\n';
  }

  return report;
}

/**
 * Creates a hook execution logger with different output formats
 *
 * @param options - Logger configuration
 * @returns Logger function
 *
 * @example
 * ```typescript
 * import { createHookLogger } from '@sammons/claude-good-hooks-factories';
 *
 * const logger = createHookLogger({
 *   format: 'structured',
 *   level: 'debug',
 *   output: '/tmp/hooks.log'
 * });
 *
 * logger.info('Hook executed successfully');
 * ```
 */
export function createHookLogger(options: {
  format?: 'simple' | 'structured' | 'json';
  level?: 'debug' | 'info' | 'warn' | 'error';
  output?: string;
}) {
  const logLevel = options.level || 'info';
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[logLevel];

  function log(level: keyof typeof levels, message: string, data?: any) {
    if (levels[level] < currentLevel) return;

    const timestamp = new Date().toISOString();
    let logEntry: string;

    switch (options.format) {
      case 'json':
        logEntry = JSON.stringify({
          timestamp,
          level: level.toUpperCase(),
          message,
          data,
        });
        break;
      case 'structured':
        logEntry = `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}`;
        if (data) {
          logEntry += `\n${JSON.stringify(data, null, 2)}`;
        }
        break;
      default:
        logEntry = `${level.toUpperCase()}: ${message}`;
    }

    if (options.output) {
      // In a real implementation, this would write to file
      console.log(`[FILE: ${options.output}] ${logEntry}`);
    } else {
      console.log(logEntry);
    }
  }

  return {
    debug: (msg: string, data?: any) => log('debug', msg, data),
    info: (msg: string, data?: any) => log('info', msg, data),
    warn: (msg: string, data?: any) => log('warn', msg, data),
    error: (msg: string, data?: any) => log('error', msg, data),
  };
}

// Helper functions

function wrapCommandWithDebug(
  command: HookCommand,
  debugConfig: HookDebugConfig,
  hookName: string
): HookCommand {
  let wrappedCommand = command.command;

  if (debugConfig.tracing) {
    wrappedCommand = `echo "[TRACE] Starting ${hookName}" >&2; ${wrappedCommand}; echo "[TRACE] Finished ${hookName}" >&2`;
  }

  if (debugConfig.profiling) {
    wrappedCommand = `time (${wrappedCommand})`;
  }

  if (debugConfig.outputFile) {
    wrappedCommand = `(${wrappedCommand}) 2>&1 | tee -a "${debugConfig.outputFile}"`;
  }

  return {
    ...command,
    command: wrappedCommand,
  };
}

function generateProfilingCommand(
  phase: 'start' | 'end',
  options: {
    outputFormat?: 'json' | 'csv' | 'text';
    metricsFile?: string;
    includeSystemMetrics?: boolean;
  }
): string {
  const timestamp = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
  const pid = '$$';

  let command = `echo "{
    \\"phase\\": \\"${phase}\\",
    \\"timestamp\\": ${timestamp},
    \\"pid\\": ${pid}"`;

  if (options.includeSystemMetrics) {
    command += `,
    \\"memory\\": $(ps -p ${pid} -o rss= 2>/dev/null || echo 0),
    \\"cpu\\": $(ps -p ${pid} -o %cpu= 2>/dev/null || echo 0)"`;
  }

  command += `}"`;

  if (options.metricsFile) {
    command += ` >> "${options.metricsFile}"`;
  }

  return command;
}

function generateTracingCommand(options: {
  traceLevel?: 'basic' | 'detailed' | 'verbose';
  includeEnvironment?: boolean;
  traceFile?: string;
}): string {
  let command = 'echo "[TRACE $(date)] Event: $1"';

  if (options.traceLevel === 'detailed' || options.traceLevel === 'verbose') {
    command += '; echo "[TRACE] PWD: $(pwd)"';
    command += '; echo "[TRACE] User: $(whoami)"';
  }

  if (options.traceLevel === 'verbose') {
    command += '; echo "[TRACE] Process: $$"';
    command += '; echo "[TRACE] Parent: $PPID"';
  }

  if (options.includeEnvironment) {
    command +=
      '; echo "[TRACE] Environment variables:"; env | grep -E "^(CLAUDE|NODE|PATH)=" | head -10';
  }

  if (options.traceFile) {
    command = `(${command}) >> "${options.traceFile}"`;
  } else {
    command = `(${command}) >&2`;
  }

  return command;
}

function generateBreakpointCommand(options: {
  condition?: string;
  interactive?: boolean;
  timeout?: number;
}): string {
  let command = '';

  if (options.condition) {
    command += `if ${options.condition}; then `;
  }

  command += 'echo "🔴 Breakpoint reached - Hook execution paused"';

  if (options.interactive) {
    command += '; echo "Press Enter to continue or Ctrl+C to abort:"';
    command += '; read -r';
  } else {
    command += '; sleep 2';
  }

  if (options.condition) {
    command += '; fi';
  }

  return command;
}

function generateErrorAnalysisCommand(options: {
  analyzeStackTrace?: boolean;
  suggestFixes?: boolean;
  reportFile?: string;
}): string {
  let command = `
if [ $? -ne 0 ]; then
  echo "🔍 Error detected - analyzing..."
  echo "Exit code: $?"
  echo "Command that failed: \$0"
  echo "Working directory: \$(pwd)"`;

  if (options.analyzeStackTrace) {
    command += `
  echo "Recent log entries:"
  tail -10 /var/log/system.log 2>/dev/null || echo "System log not accessible"`;
  }

  if (options.suggestFixes) {
    command += `
  echo "Suggested fixes:"
  echo "1. Check file permissions"
  echo "2. Verify required dependencies are installed"
  echo "3. Ensure sufficient disk space"`;
  }

  if (options.reportFile) {
    command = `(${command}) >> "${options.reportFile}"`;
  } else {
    command = `(${command}) >&2`;
  }

  command += `
fi`;

  return command;
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
