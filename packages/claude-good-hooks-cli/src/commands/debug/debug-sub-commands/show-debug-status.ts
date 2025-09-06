/**
 * Show debug status sub-command implementation
 */

import type { DebugSubCommand, DebugOptions } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';
import type { ConsoleService } from '../../../services/console.service.js';
import type { ProcessService } from '../../../services/process.service.js';

export class ShowDebugStatusCommand implements DebugSubCommand {
  constructor(
    private readonly consoleService: ConsoleService,
    private readonly processService: ProcessService
  ) {}
  match(subcommand: string): boolean {
    return subcommand === 'status';
  }

  async execute(_args: string[], options: DebugOptions): Promise<void> {
    const debugConfigs = DebugConfigurations.loadAllDebugConfigs();
    
    if (options.json) {
      this.consoleService.log(JSON.stringify(debugConfigs, null, 2));
      return;
    }
    
    this.consoleService.log('🔍 Debug Status');
    this.consoleService.log('='.repeat(40));
    
    if (Object.keys(debugConfigs).length === 0) {
      this.consoleService.log('No hooks are currently being debugged.');
      return;
    }
    
    for (const [hookName, config] of Object.entries(debugConfigs)) {
      this.consoleService.log(`\n📋 ${hookName}:`);
      this.consoleService.log(`   Status: ${config.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
      this.consoleService.log(`   Tracing: ${config.tracing ? '✅' : '❌'}`);
      this.consoleService.log(`   Profiling: ${config.profiling ? '✅' : '❌'}`);
      this.consoleService.log(`   Log Level: ${config.logLevel || 'info'}`);
      
      if (config.outputFile) {
        this.consoleService.log(`   Output File: ${config.outputFile}`);
      }
    }
  }
}