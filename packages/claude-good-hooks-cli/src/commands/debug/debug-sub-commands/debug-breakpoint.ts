/**
 * Debug breakpoint sub-command implementation
 */

import type { DebugSubCommand, DebugOptions } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';

export class DebugBreakpointCommand implements DebugSubCommand {
  match(subcommand: string): boolean {
    return subcommand === 'breakpoint';
  }

  async execute(args: string[], options: DebugOptions): Promise<void> {
    const hookName = args[1];
    const condition = args[2];
    
    if (!hookName) {
      console.error('Error: Hook name is required for breakpoint');
      process.exit(1);
    }
    
    console.log(`🔴 Setting breakpoint for hook: ${hookName}`);
    
    if (condition) {
      console.log(`   Condition: ${condition}`);
    }
    
    console.log(`   Interactive: ${options.interactive ? 'yes' : 'no'}`);
    
    // Save breakpoint configuration
    DebugConfigurations.saveBreakpointConfig(hookName, condition, options.interactive || false);
    
    console.log('✅ Breakpoint configured');
    console.log('The hook will pause execution when the breakpoint is hit');
  }
}