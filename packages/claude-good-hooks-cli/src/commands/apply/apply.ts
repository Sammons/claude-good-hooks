import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { SettingsScope } from '../../services/settings.service.js';
import type { HelpInfo } from '../command-registry.js';
import type { ApplyOptions, ValidationResult } from './apply-types.js';
import { showApplyHelp, getApplyHelpInfo } from './apply-command-help.js';
import { showHookHelp } from './apply-hook-help.js';
import { validateApplyCommand } from './apply-options.js';
import { handleRegenerate } from './apply-regenerate.js';

/**
 * Apply command - apply a hook to the configuration
 */
export class ApplyCommand {
  name = 'apply';
  description = 'Apply a hook to the configuration';
  
  private hookService: HookService;
  private processService: ProcessService;

  constructor(
    hookService?: HookService,
    processService?: ProcessService
  ) {
    this.hookService = hookService || new HookService();
    this.processService = processService || new ProcessService();
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'apply';
  }

  /**
   * Validate command arguments
   */
  validate(args: string[], options: any): boolean | ValidationResult {
    return validateApplyCommand(args, options);
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return getApplyHelpInfo();
  }

  /**
   * Execute the apply command
   */
  async execute(args: string[], options: ApplyOptions): Promise<void> {
    const { global, local, help, regenerate } = options;
    const isJson = options.parent?.json;

    // Handle regenerate mode
    if (regenerate) {
      let scope: SettingsScope | undefined;
      if (local) scope = 'local';
      if (global) scope = 'global'; // Global takes precedence over local
      
      const hookName = args.length > 0 ? args[0] : undefined;
      await handleRegenerate(this.hookService, this.processService, {
        hookName,
        scope,
        isJson
      });
      return;
    }

    if (args.length === 0) {
      if (help) {
        showApplyHelp(isJson);
        return;
      }
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: 'Hook name is required' }));
      } else {
        console.error(chalk.red('Hook name is required'));
      }
      this.processService.exit(1);
      return;
    }

    const hookName = args[0];
    if (!hookName) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: 'Hook name is required' }));
      } else {
        console.error(chalk.red('Hook name is required'));
      }
      this.processService.exit(1);
      return;
    }
    
    const hookArgs = args.slice(1);

    let scope: SettingsScope = 'project';
    if (local) scope = 'local';
    if (global) scope = 'global'; // Global takes precedence over local

    if (help) {
      await showHookHelp(this.hookService, {
        hookName,
        global: scope === 'global',
        isJson: Boolean(isJson)
      });
      return;
    }

    const result = await this.hookService.applyHook(hookName, hookArgs, scope);

    if (!result.success) {
      if (isJson) {
        console.log(JSON.stringify({ success: false, error: result.error }));
      } else {
        console.error(chalk.red(result.error || 'Unknown error'));
      }
      this.processService.exit(1);
      return;
    }

    if (isJson) {
      console.log(JSON.stringify(result));
    } else {
      console.log(chalk.green(`✓ Applied hook '${result.hook}' to ${result.scope} settings`));
      if (result.args && Object.keys(result.args).length > 0) {
        console.log(chalk.dim(`  With arguments: ${JSON.stringify(result.args)}`));
      }
    }
  }

}