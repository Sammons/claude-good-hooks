/**
 * Disable debugging sub-command implementation
 */

import type { DebugSubCommand, DebugOptions } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';

export class DisableDebuggingCommand implements DebugSubCommand {
  match(subcommand: string): boolean {
    return subcommand === 'disable';
  }

  async execute(args: string[], _options: DebugOptions): Promise<void> {
    const hookName = args[1];
    
    if (!hookName) {
      // Disable all debugging
      DebugConfigurations.clearAllDebugConfigs();
      console.log('✅ Debug disabled for all hooks');
    } else {
      // Disable debugging for specific hook
      DebugConfigurations.clearDebugConfig(hookName);
      console.log(`✅ Debug disabled for hook: ${hookName}`);
    }
  }
}