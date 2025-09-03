/**
 * Debug command implementation for Claude Good Hooks CLI
 * 
 * Provides debugging, profiling, and diagnostic tools for hooks
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  createProfilingHook,
  createTracingHook,
  generateDebugReport,
  type HookExecutionResult,
  type HookDebugConfig
} from '@sammons/claude-good-hooks-factories';

interface DebugOptions {
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

/**
 * Debug command handler
 */
export async function debugCommand(options: DebugOptions): Promise<void> {
  if (options.help) {
    showDebugHelp();
    return;
  }

  const subcommand = process.argv[3]; // The subcommand after 'debug'
  
  switch (subcommand) {
    case 'enable':
      await enableDebugging(options);
      break;
    case 'disable':
      await disableDebugging(options);
      break;
    case 'status':
      await showDebugStatus(options);
      break;
    case 'trace':
      await enableTracing(options);
      break;
    case 'profile':
      await enableProfiling(options);
      break;
    case 'report':
      await generateReport(options);
      break;
    case 'logs':
      await showLogs(options);
      break;
    case 'analyze':
      await analyzeExecution(options);
      break;
    case 'breakpoint':
      await setBreakpoint(options);
      break;
    default:
      if (!subcommand) {
        console.error('Error: Debug subcommand is required');
        console.error('Run "claude-good-hooks debug --help" for usage information');
      } else {
        console.error(`Error: Unknown debug subcommand: ${subcommand}`);
      }
      process.exit(1);
  }
}

/**
 * Enable debugging for hooks
 */
async function enableDebugging(options: DebugOptions): Promise<void> {
  const hookName = process.argv[4];
  if (!hookName) {
    console.error('Error: Hook name is required for debug enable');
    process.exit(1);
  }

  const debugConfig: HookDebugConfig = {
    enabled: true,
    tracing: options.trace || false,
    profiling: options.profile || false,
    logLevel: options.logLevel || 'info',
    outputFile: options.output
  };

  try {
    // Save debug configuration
    saveDebugConfig(hookName, debugConfig);
    
    console.log(`✅ Debug enabled for hook: ${hookName}`);
    console.log(`   Tracing: ${debugConfig.tracing ? 'enabled' : 'disabled'}`);
    console.log(`   Profiling: ${debugConfig.profiling ? 'enabled' : 'disabled'}`);
    console.log(`   Log Level: ${debugConfig.logLevel}`);
    
    if (debugConfig.outputFile) {
      console.log(`   Output File: ${debugConfig.outputFile}`);
    }
  } catch (error) {
    console.error(`Failed to enable debugging: ${error}`);
    process.exit(1);
  }
}

/**
 * Disable debugging for hooks
 */
async function disableDebugging(options: DebugOptions): Promise<void> {
  const hookName = process.argv[4];
  
  if (!hookName) {
    // Disable all debugging
    clearAllDebugConfigs();
    console.log('✅ Debug disabled for all hooks');
  } else {
    // Disable debugging for specific hook
    clearDebugConfig(hookName);
    console.log(`✅ Debug disabled for hook: ${hookName}`);
  }
}

/**
 * Show debugging status
 */
async function showDebugStatus(options: DebugOptions): Promise<void> {
  const debugConfigs = loadAllDebugConfigs();
  
  if (options.json) {
    console.log(JSON.stringify(debugConfigs, null, 2));
    return;
  }
  
  console.log('🔍 Debug Status');
  console.log('='.repeat(40));
  
  if (Object.keys(debugConfigs).length === 0) {
    console.log('No hooks are currently being debugged.');
    return;
  }
  
  for (const [hookName, config] of Object.entries(debugConfigs)) {
    console.log(`\n📋 ${hookName}:`);
    console.log(`   Status: ${config.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    console.log(`   Tracing: ${config.tracing ? '✅' : '❌'}`);
    console.log(`   Profiling: ${config.profiling ? '✅' : '❌'}`);
    console.log(`   Log Level: ${config.logLevel || 'info'}`);
    
    if (config.outputFile) {
      console.log(`   Output File: ${config.outputFile}`);
    }
  }
}

/**
 * Enable execution tracing
 */
async function enableTracing(options: DebugOptions): Promise<void> {
  const traceLevel = options.logLevel === 'debug' ? 'verbose' : 'detailed';
  const traceFile = options.output || join(process.cwd(), '.claude/trace.log');
  
  console.log(`🔍 Tracing enabled`);
  console.log(`   Level: ${traceLevel}`);
  console.log(`   Output: ${traceFile}`);
  
  // Create trace hook configuration
  const tracingHook = createTracingHook({
    name: 'debug-tracer',
    description: 'Debug execution tracer',
    traceLevel: traceLevel as 'basic' | 'detailed' | 'verbose',
    traceFile,
    includeEnvironment: true
  });
  
  // Save tracing configuration
  saveTracingConfig(tracingHook);
  
  console.log('✅ Tracing hook configured');
  console.log('Use "claude-good-hooks apply debug-tracer" to activate');
}

/**
 * Enable performance profiling
 */
async function enableProfiling(options: DebugOptions): Promise<void> {
  const metricsFile = options.output || join(process.cwd(), '.claude/metrics.json');
  
  console.log(`⚡ Profiling enabled`);
  console.log(`   Metrics file: ${metricsFile}`);
  
  // Create profiling hook configuration
  const profilingHook = createProfilingHook({
    name: 'debug-profiler',
    description: 'Performance profiler',
    outputFormat: 'json',
    metricsFile,
    includeSystemMetrics: true
  });
  
  // Save profiling configuration
  saveProfilingConfig(profilingHook);
  
  console.log('✅ Profiling hook configured');
  console.log('Use "claude-good-hooks apply debug-profiler" to activate');
}

/**
 * Generate debug report
 */
async function generateReport(options: DebugOptions): Promise<void> {
  const reportType = process.argv[4] || 'summary';
  const outputFile = options.output || join(process.cwd(), '.claude/debug-report.txt');
  
  console.log(`📊 Generating ${reportType} report...`);
  
  try {
    let report: string;
    
    switch (reportType) {
      case 'summary':
        report = generateSummaryReport();
        break;
      case 'performance':
        report = await generatePerformanceReport();
        break;
      case 'errors':
        report = generateErrorReport();
        break;
      case 'trace':
        report = generateTraceReport();
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
    
    if (options.output) {
      writeFileSync(outputFile, report, 'utf8');
      console.log(`✅ Report saved to: ${outputFile}`);
    } else {
      console.log('\n' + report);
    }
  } catch (error) {
    console.error(`Failed to generate report: ${error}`);
    process.exit(1);
  }
}

/**
 * Show debug logs
 */
async function showLogs(options: DebugOptions): Promise<void> {
  const logFile = options.output || findLatestLogFile();
  
  if (!logFile || !existsSync(logFile)) {
    console.log('No debug logs found');
    return;
  }
  
  console.log(`📋 Debug Logs from: ${logFile}`);
  console.log('='.repeat(50));
  
  try {
    const logs = readFileSync(logFile, 'utf8');
    const lines = logs.split('\n');
    
    // Apply log level filter
    const filteredLines = lines.filter(line => {
      if (!options.logLevel) return true;
      return line.toLowerCase().includes(options.logLevel);
    });
    
    // Show last 50 lines by default
    const recentLines = filteredLines.slice(-50);
    console.log(recentLines.join('\n'));
    
    if (filteredLines.length > 50) {
      console.log(`\n... (${filteredLines.length - 50} more lines)`);
      console.log('Use --output to specify a different log file');
    }
  } catch (error) {
    console.error(`Failed to read log file: ${error}`);
    process.exit(1);
  }
}

/**
 * Analyze hook execution
 */
async function analyzeExecution(options: DebugOptions): Promise<void> {
  const executionId = process.argv[4];
  
  if (!executionId) {
    // Show recent executions
    const executions = loadRecentExecutions();
    
    if (executions.length === 0) {
      console.log('No recent hook executions found');
      return;
    }
    
    console.log('🔍 Recent Hook Executions:');
    console.log('='.repeat(40));
    
    executions.forEach((exec, index) => {
      const status = exec.success ? '✅' : '❌';
      const duration = exec.duration.toFixed(2);
      console.log(`${index + 1}. ${status} ${exec.context.hookName} (${duration}ms)`);
      console.log(`   ID: ${exec.context.executionId}`);
      console.log(`   Time: ${exec.context.timestamp.toLocaleString()}`);
      console.log();
    });
    
    console.log('Use "claude-good-hooks debug analyze <execution-id>" for details');
  } else {
    // Analyze specific execution
    const execution = findExecution(executionId);
    
    if (!execution) {
      console.error(`Execution not found: ${executionId}`);
      process.exit(1);
    }
    
    const report = generateDebugReport(execution, {
      includeEnvironment: true,
      includeMetrics: true,
      includeStackTrace: true
    });
    
    if (options.output) {
      writeFileSync(options.output, report, 'utf8');
      console.log(`✅ Analysis saved to: ${options.output}`);
    } else {
      console.log(report);
    }
  }
}

/**
 * Set breakpoint for debugging
 */
async function setBreakpoint(options: DebugOptions): Promise<void> {
  const hookName = process.argv[4];
  const condition = process.argv[5];
  
  if (!hookName) {
    console.error('Error: Hook name is required for breakpoint');
    process.exit(1);
  }
  
  console.log(`🔴 Setting breakpoint for hook: ${hookName}`);
  
  if (condition) {
    console.log(`   Condition: ${condition}`);
  }
  
  console.log(`   Interactive: ${options.interactive ? 'yes' : 'no'}`);
  
  // Save breakpoint configuration
  saveBreakpointConfig(hookName, condition, options.interactive || false);
  
  console.log('✅ Breakpoint configured');
  console.log('The hook will pause execution when the breakpoint is hit');
}

/**
 * Show help information
 */
function showDebugHelp(): void {
  console.log(`
Claude Good Hooks Debug Tool

Usage:
  claude-good-hooks debug <command> [options]

Commands:
  enable <hook>       Enable debugging for a specific hook
  disable [hook]      Disable debugging (for specific hook or all hooks)
  status              Show current debugging status
  trace               Enable execution tracing
  profile             Enable performance profiling
  report [type]       Generate debug report (summary|performance|errors|trace)
  logs                Show debug logs
  analyze [id]        Analyze hook execution (show recent or specific)
  breakpoint <hook>   Set debugging breakpoint

Options:
  --help              Show this help message
  --trace             Enable tracing when enabling debug
  --profile           Enable profiling when enabling debug
  --breakpoint        Set breakpoint when enabling debug
  --output <file>     Output file for logs/reports
  --log-level <level> Log level (debug|info|warn|error)
  --interactive       Enable interactive breakpoints
  --json              Output in JSON format (for status)

Examples:
  claude-good-hooks debug enable my-hook --trace --profile
  claude-good-hooks debug status --json
  claude-good-hooks debug trace --output ./trace.log
  claude-good-hooks debug report performance --output ./perf-report.txt
  claude-good-hooks debug breakpoint my-hook "file.endsWith('.ts')"
  claude-good-hooks debug analyze abc123-def456
`);
}

// Helper functions

function saveDebugConfig(hookName: string, config: HookDebugConfig): void {
  const configDir = join(process.cwd(), '.claude');
  const configFile = join(configDir, 'debug-configs.json');
  
  let configs: Record<string, HookDebugConfig> = {};
  
  if (existsSync(configFile)) {
    try {
      configs = JSON.parse(readFileSync(configFile, 'utf8'));
    } catch {
      // Ignore parse errors, start fresh
    }
  }
  
  configs[hookName] = config;
  
  writeFileSync(configFile, JSON.stringify(configs, null, 2), 'utf8');
}

function clearDebugConfig(hookName: string): void {
  const configFile = join(process.cwd(), '.claude', 'debug-configs.json');
  
  if (!existsSync(configFile)) return;
  
  try {
    const configs = JSON.parse(readFileSync(configFile, 'utf8'));
    delete configs[hookName];
    writeFileSync(configFile, JSON.stringify(configs, null, 2), 'utf8');
  } catch {
    // Ignore errors
  }
}

function clearAllDebugConfigs(): void {
  const configFile = join(process.cwd(), '.claude', 'debug-configs.json');
  
  if (existsSync(configFile)) {
    writeFileSync(configFile, '{}', 'utf8');
  }
}

function loadAllDebugConfigs(): Record<string, HookDebugConfig> {
  const configFile = join(process.cwd(), '.claude', 'debug-configs.json');
  
  if (!existsSync(configFile)) return {};
  
  try {
    return JSON.parse(readFileSync(configFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveTracingConfig(hook: any): void {
  const configFile = join(process.cwd(), '.claude', 'tracing-hook.json');
  writeFileSync(configFile, JSON.stringify(hook, null, 2), 'utf8');
}

function saveProfilingConfig(hook: any): void {
  const configFile = join(process.cwd(), '.claude', 'profiling-hook.json');
  writeFileSync(configFile, JSON.stringify(hook, null, 2), 'utf8');
}

function saveBreakpointConfig(hookName: string, condition?: string, interactive: boolean = false): void {
  const configFile = join(process.cwd(), '.claude', 'breakpoints.json');
  
  let breakpoints: Record<string, any> = {};
  
  if (existsSync(configFile)) {
    try {
      breakpoints = JSON.parse(readFileSync(configFile, 'utf8'));
    } catch {
      // Ignore parse errors
    }
  }
  
  breakpoints[hookName] = {
    condition,
    interactive,
    timestamp: new Date().toISOString()
  };
  
  writeFileSync(configFile, JSON.stringify(breakpoints, null, 2), 'utf8');
}

function findLatestLogFile(): string | null {
  const logDir = join(process.cwd(), '.claude');
  const possibleFiles = [
    join(logDir, 'debug.log'),
    join(logDir, 'trace.log'),
    join(logDir, 'hooks.log')
  ];
  
  for (const file of possibleFiles) {
    if (existsSync(file)) {
      return file;
    }
  }
  
  return null;
}

function loadRecentExecutions(): HookExecutionResult[] {
  const executionsFile = join(process.cwd(), '.claude', 'executions.json');
  
  if (!existsSync(executionsFile)) return [];
  
  try {
    const data = JSON.parse(readFileSync(executionsFile, 'utf8'));
    return data.executions || [];
  } catch {
    return [];
  }
}

function findExecution(executionId: string): HookExecutionResult | null {
  const executions = loadRecentExecutions();
  return executions.find(exec => exec.context.executionId === executionId) || null;
}

function generateSummaryReport(): string {
  const debugConfigs = loadAllDebugConfigs();
  const executions = loadRecentExecutions();
  
  let report = '🔍 Debug Summary Report\n';
  report += '='.repeat(50) + '\n\n';
  
  report += `📊 Statistics:\n`;
  report += `   Hooks with debug enabled: ${Object.keys(debugConfigs).length}\n`;
  report += `   Recent executions: ${executions.length}\n`;
  
  const successfulRuns = executions.filter(e => e.success).length;
  const failedRuns = executions.length - successfulRuns;
  
  report += `   Successful runs: ${successfulRuns}\n`;
  report += `   Failed runs: ${failedRuns}\n\n`;
  
  if (Object.keys(debugConfigs).length > 0) {
    report += '🔧 Debug-enabled hooks:\n';
    Object.keys(debugConfigs).forEach(hook => {
      report += `   • ${hook}\n`;
    });
    report += '\n';
  }
  
  return report;
}

async function generatePerformanceReport(): Promise<string> {
  const metricsFile = join(process.cwd(), '.claude', 'metrics.json');
  
  let report = '⚡ Performance Report\n';
  report += '='.repeat(50) + '\n\n';
  
  if (!existsSync(metricsFile)) {
    report += 'No performance metrics available.\n';
    report += 'Enable profiling with: claude-good-hooks debug profile\n';
    return report;
  }
  
  try {
    const metrics = readFileSync(metricsFile, 'utf8');
    const lines = metrics.split('\n').filter(line => line.trim());
    
    report += `📈 Metrics (${lines.length} data points):\n\n`;
    
    // Parse and analyze metrics
    const parsedMetrics = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    if (parsedMetrics.length > 0) {
      const avgMemory = parsedMetrics
        .filter(m => m.memory)
        .reduce((sum, m) => sum + m.memory, 0) / parsedMetrics.length;
        
      const avgCpu = parsedMetrics
        .filter(m => m.cpu)
        .reduce((sum, m) => sum + m.cpu, 0) / parsedMetrics.length;
      
      report += `   Average Memory: ${(avgMemory / 1024).toFixed(2)} MB\n`;
      report += `   Average CPU: ${avgCpu.toFixed(2)}%\n`;
    }
    
  } catch (error) {
    report += `Error reading metrics: ${error}\n`;
  }
  
  return report;
}

function generateErrorReport(): string {
  const executions = loadRecentExecutions();
  const failures = executions.filter(e => !e.success);
  
  let report = '❌ Error Report\n';
  report += '='.repeat(50) + '\n\n';
  
  if (failures.length === 0) {
    report += 'No errors found in recent executions.\n';
    return report;
  }
  
  report += `📊 Found ${failures.length} failed executions:\n\n`;
  
  failures.forEach((failure, index) => {
    report += `${index + 1}. ${failure.context.hookName}\n`;
    report += `   Time: ${failure.context.timestamp.toLocaleString()}\n`;
    report += `   Exit Code: ${failure.exitCode || 'unknown'}\n`;
    
    if (failure.error) {
      report += `   Error: ${failure.error.substring(0, 100)}${failure.error.length > 100 ? '...' : ''}\n`;
    }
    
    report += '\n';
  });
  
  return report;
}

function generateTraceReport(): string {
  const traceFile = join(process.cwd(), '.claude', 'trace.log');
  
  let report = '🔍 Trace Report\n';
  report += '='.repeat(50) + '\n\n';
  
  if (!existsSync(traceFile)) {
    report += 'No trace data available.\n';
    report += 'Enable tracing with: claude-good-hooks debug trace\n';
    return report;
  }
  
  try {
    const traceData = readFileSync(traceFile, 'utf8');
    const lines = traceData.split('\n').filter(line => line.includes('[TRACE'));
    
    report += `📋 Trace entries: ${lines.length}\n\n`;
    
    // Show recent trace entries
    const recentTraces = lines.slice(-20);
    recentTraces.forEach(line => {
      report += `   ${line}\n`;
    });
    
    if (lines.length > 20) {
      report += `\n   ... (${lines.length - 20} more entries)\n`;
    }
    
  } catch (error) {
    report += `Error reading trace file: ${error}\n`;
  }
  
  return report;
}