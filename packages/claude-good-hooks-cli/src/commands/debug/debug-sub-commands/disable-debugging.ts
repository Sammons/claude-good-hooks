/**
 * Disable debugging sub-command implementation
 */

import type { DebugSubCommand, DebugOptions } from '../debug-types.js';
import { DebugConfigurations } from './debugging-utils/debug-configs.js';
import type { ConsoleService } from '../../../services/console.service.js';
import type { ProcessService } from '../../../services/process.service.js';

export class DisableDebuggingCommand implements DebugSubCommand {
  constructor(
    private readonly consoleService: ConsoleService,
    private readonly processService: ProcessService
  ) {}
  match(subcommand: string): boolean {
    return subcommand === 'disable';
  }

  async execute(args: string[], _options: DebugOptions): Promise<void> {
    const hookName = args[1];
    
    if (!hookName) {
      // Disable all debugging
      DebugConfigurations.clearAllDebugConfigs();
      this.consoleService.log('✅ Debug disabled for all hooks');
    } else {
      // Disable debugging for specific hook
      DebugConfigurations.clearDebugConfig(hookName);
      this.consoleService.log(`✅ Debug disabled for hook: ${hookName}`);
    }
  }
}