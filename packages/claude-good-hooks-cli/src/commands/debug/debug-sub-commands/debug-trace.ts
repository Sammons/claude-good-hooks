/**
 * Debug trace sub-command implementation
 */

import { join } from 'path';
import type { DebugSubCommand, DebugOptions, TracingHookConfig } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';
import type { ConsoleService } from '../../../services/console.service.js';
import type { ProcessService } from '../../../services/process.service.js';

// Mock factory function - in real implementation this would come from factories package
function createTracingHook(config: TracingHookConfig): TracingHookConfig {
  return config;
}

export class DebugTraceCommand implements DebugSubCommand {
  constructor(
    private readonly consoleService: ConsoleService,
    private readonly processService: ProcessService
  ) {}
  match(subcommand: string): boolean {
    return subcommand === 'trace';
  }

  async execute(_args: string[], options: DebugOptions): Promise<void> {
    const traceLevel = options.logLevel === 'debug' ? 'verbose' : 'detailed';
    const traceFile = options.output || join(process.cwd(), '.claude/trace.log');
    
    this.consoleService.log(`🔍 Tracing enabled`);
    this.consoleService.log(`   Level: ${traceLevel}`);
    this.consoleService.log(`   Output: ${traceFile}`);
    
    // Create trace hook configuration
    const tracingHook = createTracingHook({
      name: 'debug-tracer',
      description: 'Debug execution tracer',
      traceLevel: traceLevel as 'basic' | 'detailed' | 'verbose',
      traceFile,
      includeEnvironment: true
    });
    
    // Save tracing configuration
    DebugConfigurations.saveTracingConfig(tracingHook);
    
    this.consoleService.log('✅ Tracing hook configured');
    this.consoleService.log('Use "claude-good-hooks apply debug-tracer" to activate');
  }
}