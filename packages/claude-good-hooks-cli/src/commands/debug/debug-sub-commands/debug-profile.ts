/**
 * Debug profile sub-command implementation
 */

import { join } from 'path';
import type { DebugSubCommand, DebugOptions, ProfilingHookConfig } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';

// Mock factory function - in real implementation this would come from factories package
function createProfilingHook(config: ProfilingHookConfig): ProfilingHookConfig {
  return config;
}

export class DebugProfileCommand implements DebugSubCommand {
  match(subcommand: string): boolean {
    return subcommand === 'profile';
  }

  async execute(_args: string[], options: DebugOptions): Promise<void> {
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
    DebugConfigurations.saveProfilingConfig(profilingHook);
    
    console.log('✅ Profiling hook configured');
    console.log('Use "claude-good-hooks apply debug-profiler" to activate');
  }
}