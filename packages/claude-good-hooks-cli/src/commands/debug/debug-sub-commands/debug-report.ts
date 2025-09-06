/**
 * Debug report generation sub-command implementation
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { DebugSubCommand, DebugOptions, DebugMetrics } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';
import type { ConsoleService } from '../../../services/console.service.js';
import type { ProcessService } from '../../../services/process.service.js';

export class DebugReportCommand implements DebugSubCommand {
  constructor(
    private readonly consoleService: ConsoleService,
    private readonly processService: ProcessService
  ) {}
  match(subcommand: string): boolean {
    return subcommand === 'report';
  }

  async execute(args: string[], options: DebugOptions): Promise<void> {
    const reportType = args[1] || 'summary';
    const outputFile = options.output || join(process.cwd(), '.claude/debug-report.txt');
    
    this.consoleService.log(`📊 Generating ${reportType} report...`);
    
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
        this.consoleService.log(`✅ Report saved to: ${outputFile}`);
      } else {
        this.consoleService.log('\n' + report);
      }
    } catch (error) {
      this.consoleService.error(`Failed to generate report: ${error}`);
      this.processService.exit(1);
    }
  }

  private generateSummaryReport(): string {
    const debugConfigs = DebugConfigurations.loadAllDebugConfigs();
    const executions = DebugConfigurations.loadRecentExecutions();
    
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
    const metricsFile = DebugConfigurations.getMetricsFilePath();
    
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
          return JSON.parse(line) as DebugMetrics;
        } catch {
          return null;
        }
      }).filter((metric): metric is DebugMetrics => metric !== null);
      
      if (parsedMetrics.length > 0) {
        const memoryMetrics = parsedMetrics.filter(m => typeof m.memory === 'number');
        const cpuMetrics = parsedMetrics.filter(m => typeof m.cpu === 'number');
        
        if (memoryMetrics.length > 0) {
          const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.memory!, 0) / memoryMetrics.length;
          report += `   Average Memory: ${(avgMemory / 1024).toFixed(2)} MB\n`;
        }
        
        if (cpuMetrics.length > 0) {
          const avgCpu = cpuMetrics.reduce((sum, m) => sum + m.cpu!, 0) / cpuMetrics.length;
          report += `   Average CPU: ${avgCpu.toFixed(2)}%\n`;
        }
      }
      
    } catch (error) {
      report += `Error reading metrics: ${error}\n`;
    }
    
    return report;
  }

  private generateErrorReport(): string {
    const executions = DebugConfigurations.loadRecentExecutions();
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
        const errorText = failure.error.substring(0, 100);
        const truncated = failure.error.length > 100 ? '...' : '';
        report += `   Error: ${errorText}${truncated}\n`;
      }
      
      report += '\n';
    });
    
    return report;
  }

  private generateTraceReport(): string {
    const traceFile = DebugConfigurations.getTraceFilePath();
    
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