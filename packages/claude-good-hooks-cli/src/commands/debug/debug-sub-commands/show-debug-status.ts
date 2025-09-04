/**
 * Show debug status sub-command implementation
 */

import type { DebugSubCommand, DebugOptions } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';

export class ShowDebugStatusCommand implements DebugSubCommand {
  match(subcommand: string): boolean {
    return subcommand === 'status';
  }

  async execute(_args: string[], options: DebugOptions): Promise<void> {
    const debugConfigs = DebugConfigurations.loadAllDebugConfigs();
    
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
}