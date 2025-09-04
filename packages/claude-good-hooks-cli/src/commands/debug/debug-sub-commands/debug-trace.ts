/**
 * Debug trace sub-command implementation
 */

import { join } from 'path';
import type { DebugSubCommand, DebugOptions, TracingHookConfig } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';

// Mock factory function - in real implementation this would come from factories package
function createTracingHook(config: TracingHookConfig): TracingHookConfig {
  return config;
}

export class DebugTraceCommand implements DebugSubCommand {
  match(subcommand: string): boolean {
    return subcommand === 'trace';
  }

  async execute(_args: string[], options: DebugOptions): Promise<void> {
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
    DebugConfigurations.saveTracingConfig(tracingHook);
    
    console.log('✅ Tracing hook configured');
    console.log('Use "claude-good-hooks apply debug-tracer" to activate');
  }
}