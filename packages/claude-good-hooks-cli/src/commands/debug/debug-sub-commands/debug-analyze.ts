/**
 * Debug analyze execution sub-command implementation
 */

import { writeFileSync } from 'fs';
import type { DebugSubCommand, DebugOptions, HookExecutionResult } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';

// Mock factory function - in real implementation this would come from factories package
function generateDebugReport(execution: HookExecutionResult, _options: { 
  includeEnvironment: boolean; 
  includeMetrics: boolean; 
  includeStackTrace: boolean; 
}): string {
  return `Debug report for ${execution.context?.hookName || 'unknown'}`;
}

export class DebugAnalyzeCommand implements DebugSubCommand {
  match(subcommand: string): boolean {
    return subcommand === 'analyze';
  }

  async execute(args: string[], options: DebugOptions): Promise<void> {
    const executionId = args[1];
    
    if (!executionId) {
      // Show recent executions
      const executions = DebugConfigurations.loadRecentExecutions();
      
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
      const execution = DebugConfigurations.findExecution(executionId);
      
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
}