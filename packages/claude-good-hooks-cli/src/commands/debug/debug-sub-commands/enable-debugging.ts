/**
 * Enable debugging sub-command implementation
 */

import type { DebugSubCommand, DebugOptions, HookDebugConfig } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';
import type { ConsoleService } from '../../../services/console.service.js';
import type { ProcessService } from '../../../services/process.service.js';

export class EnableDebuggingCommand implements DebugSubCommand {
  constructor(
    private readonly consoleService: ConsoleService,
    private readonly processService: ProcessService
  ) {}

  match(subcommand: string): boolean {
    return subcommand === 'enable';
  }

  async execute(args: string[], options: DebugOptions): Promise<void> {
    const hookName = args[1];
    if (!hookName) {
      this.consoleService.error('Error: Hook name is required for debug enable');
      this.processService.exit(1);
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
      DebugConfigurations.saveDebugConfig(hookName, debugConfig);
      
      this.consoleService.log(`✅ Debug enabled for hook: ${hookName}`);
      this.consoleService.log(`   Tracing: ${debugConfig.tracing ? 'enabled' : 'disabled'}`);
      this.consoleService.log(`   Profiling: ${debugConfig.profiling ? 'enabled' : 'disabled'}`);
      this.consoleService.log(`   Log Level: ${debugConfig.logLevel}`);
      
      if (debugConfig.outputFile) {
        this.consoleService.log(`   Output File: ${debugConfig.outputFile}`);
      }
    } catch (error) {
      this.consoleService.error(`Failed to enable debugging: ${error}`);
      this.processService.exit(1);
    }
  }
}