/**
 * Enable debugging sub-command implementation
 */

import type { DebugSubCommand, DebugOptions, HookDebugConfig } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';

export class EnableDebuggingCommand implements DebugSubCommand {
  match(subcommand: string): boolean {
    return subcommand === 'enable';
  }

  async execute(args: string[], options: DebugOptions): Promise<void> {
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
      DebugConfigurations.saveDebugConfig(hookName, debugConfig);
      
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
}