/**
 * Debug command implementation for Claude Good Hooks CLI
 * 
 * Provides debugging, profiling, and diagnostic tools for hooks
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { HelpInfo } from '../command-registry.js';

// Mock types for factories that may not be available
interface HookExecutionResult {
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

interface HookDebugConfig {
  enabled: boolean;
  tracing: boolean;
  profiling: boolean;
  logLevel: string;
  outputFile?: string;
}

// Mock factory functions - in real implementation these would come from factories package
function createProfilingHook(config: any) {
  return config;
}

function createTracingHook(config: any) {
  return config;
}

function generateDebugReport(execution: any, _options: any) {
  return `Debug report for ${execution.context?.hookName || 'unknown'}`;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

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
 * Debug command - debugging, profiling, and diagnostic tools for hooks
 */
export class DebugCommand {
  name = 'debug';
  description = 'Debugging, profiling, and diagnostic tools for hooks';

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'debug';
  }

  /**
   * Validate command arguments
   */
  validate(args: string[], options: any): boolean | ValidationResult {
    // Allow help option
    if (options.help) {
      return true;
    }

    // Debug command accepts subcommands
    const validSubcommands = [
      'enable', 'disable', 'status', 'trace', 'profile', 
      'report', 'logs', 'analyze', 'breakpoint'
    ];

    if (args.length > 0 && !validSubcommands.includes(args[0]!)) {
      return {
        valid: false,
        errors: [`Invalid debug subcommand: ${args[0]}. Valid subcommands: ${validSubcommands.join(', ')}`]
      };
    }

    if (options.logLevel && !['debug', 'info', 'warn', 'error'].includes(options.logLevel)) {
      return {
        valid: false,
        errors: ['Invalid log level. Must be one of: debug, info, warn, error']
      };
    }

    return true;
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks debug <subcommand> [options]',
      options: [
        {
          name: 'help',
          description: 'Show this help message',
          type: 'boolean'
        },
        {
          name: 'trace',
          description: 'Enable tracing when enabling debug',
          type: 'boolean'
        },
        {
          name: 'profile',
          description: 'Enable profiling when enabling debug',
          type: 'boolean'
        },
        {
          name: 'breakpoint',
          description: 'Set breakpoint when enabling debug',
          type: 'boolean'
        },
        {
          name: 'output',
          description: 'Output file for logs/reports',
          type: 'string'
        },
        {
          name: 'log-level',
          description: 'Log level (debug|info|warn|error)',
          type: 'string'
        },
        {
          name: 'interactive',
          description: 'Enable interactive breakpoints',
          type: 'boolean'
        },
        {
          name: 'json',
          description: 'Output in JSON format (for status)',
          type: 'boolean'
        }
      ],
      arguments: [
        {
          name: 'subcommand',
          description: 'Debug subcommand',
          required: true
        }
      ],
      examples: [
        'claude-good-hooks debug enable my-hook --trace --profile',
        'claude-good-hooks debug status --json',
        'claude-good-hooks debug trace --output ./trace.log',
        'claude-good-hooks debug report performance --output ./perf-report.txt',
        'claude-good-hooks debug breakpoint my-hook "file.endsWith(\'.ts\')"',
        'claude-good-hooks debug analyze abc123-def456'
      ]
    };
  }

  /**
   * Execute the debug command
   */
  async execute(args: string[], options: DebugOptions): Promise<void> {
    if (options.help || args.length === 0) {
      this.showDebugHelp();
      return;
    }

    const subcommand = args[0];
    
    switch (subcommand) {
      case 'enable':
        await this.enableDebugging(args, options);
        break;
      case 'disable':
        await this.disableDebugging(args, options);
        break;
      case 'status':
        await this.showDebugStatus(options);
        break;
      case 'trace':
        await this.enableTracing(options);
        break;
      case 'profile':
        await this.enableProfiling(options);
        break;
      case 'report':
        await this.generateReport(args, options);
        break;
      case 'logs':
        await this.showLogs(options);
        break;
      case 'analyze':
        await this.analyzeExecution(args, options);
        break;
      case 'breakpoint':
        await this.setBreakpoint(args, options);
        break;
      default:
        console.error(`Error: Unknown debug subcommand: ${subcommand}`);
        console.error('Run "claude-good-hooks debug --help" for usage information');
        process.exit(1);
    }
  }

  /**
   * Enable debugging for hooks
   */
  private async enableDebugging(args: string[], options: DebugOptions): Promise<void> {
    const hookName = args[1];
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
      this.saveDebugConfig(hookName, debugConfig);
      
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
  private async disableDebugging(args: string[], _options: DebugOptions): Promise<void> {
    const hookName = args[1];
    
    if (!hookName) {
      // Disable all debugging
      this.clearAllDebugConfigs();
      console.log('✅ Debug disabled for all hooks');
    } else {
      // Disable debugging for specific hook
      this.clearDebugConfig(hookName);
      console.log(`✅ Debug disabled for hook: ${hookName}`);
    }
  }

  /**
   * Show debugging status
   */
  private async showDebugStatus(options: DebugOptions): Promise<void> {
    const debugConfigs = this.loadAllDebugConfigs();
    
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
  private async enableTracing(options: DebugOptions): Promise<void> {
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
    this.saveTracingConfig(tracingHook);
    
    console.log('✅ Tracing hook configured');
    console.log('Use "claude-good-hooks apply debug-tracer" to activate');
  }

  /**
   * Enable performance profiling
   */
  private async enableProfiling(options: DebugOptions): Promise<void> {
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
    this.saveProfilingConfig(profilingHook);
    
    console.log('✅ Profiling hook configured');
    console.log('Use "claude-good-hooks apply debug-profiler" to activate');
  }

  /**
   * Generate debug report
   */
  private async generateReport(args: string[], options: DebugOptions): Promise<void> {
    const reportType = args[1] || 'summary';
    const outputFile = options.output || join(process.cwd(), '.claude/debug-report.txt');
    
    console.log(`📊 Generating ${reportType} report...`);
    
    try {
      let report: string;
      
      switch (reportType) {
        case 'summary':
          report = this.generateSummaryReport();
          break;
        case 'performance':
          report = await this.generatePerformanceReport();
          break;
        case 'errors':
          report = this.generateErrorReport();
          break;
        case 'trace':
          report = this.generateTraceReport();
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
  private async showLogs(options: DebugOptions): Promise<void> {
    const logFile = options.output || this.findLatestLogFile();
    
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
  private async analyzeExecution(args: string[], options: DebugOptions): Promise<void> {
    const executionId = args[1];
    
    if (!executionId) {
      // Show recent executions
      const executions = this.loadRecentExecutions();
      
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
      const execution = this.findExecution(executionId);
      
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
  private async setBreakpoint(args: string[], options: DebugOptions): Promise<void> {
    const hookName = args[1];
    const condition = args[2];
    
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
    this.saveBreakpointConfig(hookName, condition, options.interactive || false);
    
    console.log('✅ Breakpoint configured');
    console.log('The hook will pause execution when the breakpoint is hit');
  }

  /**
   * Show help information
   */
  private showDebugHelp(): void {
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

  private saveDebugConfig(hookName: string, config: HookDebugConfig): void {
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

  private clearDebugConfig(hookName: string): void {
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

  private clearAllDebugConfigs(): void {
    const configFile = join(process.cwd(), '.claude', 'debug-configs.json');
    
    if (existsSync(configFile)) {
      writeFileSync(configFile, '{}', 'utf8');
    }
  }

  private loadAllDebugConfigs(): Record<string, HookDebugConfig> {
    const configFile = join(process.cwd(), '.claude', 'debug-configs.json');
    
    if (!existsSync(configFile)) return {};
    
    try {
      return JSON.parse(readFileSync(configFile, 'utf8'));
    } catch {
      return {};
    }
  }

  private saveTracingConfig(hook: any): void {
    const configFile = join(process.cwd(), '.claude', 'tracing-hook.json');
    writeFileSync(configFile, JSON.stringify(hook, null, 2), 'utf8');
  }

  private saveProfilingConfig(hook: any): void {
    const configFile = join(process.cwd(), '.claude', 'profiling-hook.json');
    writeFileSync(configFile, JSON.stringify(hook, null, 2), 'utf8');
  }

  private saveBreakpointConfig(hookName: string, condition?: string, interactive: boolean = false): void {
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

  private findLatestLogFile(): string | null {
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

  private loadRecentExecutions(): HookExecutionResult[] {
    const executionsFile = join(process.cwd(), '.claude', 'executions.json');
    
    if (!existsSync(executionsFile)) return [];
    
    try {
      const data = JSON.parse(readFileSync(executionsFile, 'utf8'));
      return data.executions || [];
    } catch {
      return [];
    }
  }

  private findExecution(executionId: string): HookExecutionResult | null {
    const executions = this.loadRecentExecutions();
    return executions.find(exec => exec.context.executionId === executionId) || null;
  }

  private generateSummaryReport(): string {
    const debugConfigs = this.loadAllDebugConfigs();
    const executions = this.loadRecentExecutions();
    
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

  private async generatePerformanceReport(): Promise<string> {
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

  private generateErrorReport(): string {
    const executions = this.loadRecentExecutions();
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

  private generateTraceReport(): string {
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
}