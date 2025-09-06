/**
 * Debug breakpoint sub-command implementation
 */

import type { DebugSubCommand, DebugOptions } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';
import type { ConsoleService } from '../../../services/console.service.js';
import type { ProcessService } from '../../../services/process.service.js';

export class DebugBreakpointCommand implements DebugSubCommand {
  constructor(
    private readonly consoleService: ConsoleService,
    private readonly processService: ProcessService
  ) {}
  match(subcommand: string): boolean {
    return subcommand === 'breakpoint';
  }

  async execute(args: string[], options: DebugOptions): Promise<void> {
    const hookName = args[1];
    const condition = args[2];
    
    if (!hookName) {
      this.consoleService.error('Error: Hook name is required for breakpoint');
      this.processService.exit(1);
    }
    
    this.consoleService.log(`🔴 Setting breakpoint for hook: ${hookName}`);
    
    if (condition) {
      this.consoleService.log(`   Condition: ${condition}`);
    }
    
    this.consoleService.log(`   Interactive: ${options.interactive ? 'yes' : 'no'}`);
    
    // Save breakpoint configuration
    DebugConfigurations.saveBreakpointConfig(hookName, condition, options.interactive || false);
    
    this.consoleService.log('✅ Breakpoint configured');
    this.consoleService.log('The hook will pause execution when the breakpoint is hit');
  }
}