/**
 * Apply hook sub-command implementation - handles the main apply hook functionality
 */

import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { SettingsScope } from '../../services/settings.service.js';
import type { ApplySubCommand } from './apply-types.js';
import type { ApplyOptions } from './apply-options.js';
import type { ValidationResult } from '../common-validation-types.js';

export class ApplyHookCommand implements ApplySubCommand {
  private hookService: HookService;
  private processService: ProcessService;

  constructor(hookService: HookService, processService: ProcessService) {
    this.hookService = hookService;
    this.processService = processService;
  }

  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(args: string[], options: ApplyOptions): boolean {
    // Match when not regenerate, not help, and has hook name
    return !options.regenerate && !options.help && args.length > 0;
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(args: string[], options: ApplyOptions): ValidationResult<ApplyOptions> {
    if (args.length === 0) {
      return {
        valid: false,
        errors: ['Hook name is required'],
      };
    }

    return {
      valid: true,
      result: options,
    };
  }

  /**
   * Execute the apply hook command
   */
  async execute(args: [string, ...string[]], options: ApplyOptions): Promise<void> {
    const hookName = args[0];
    const hookArgs = args.slice(1);
    const scope = this.getScope(options);
    const isJson = options.parent?.json;

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

  private getScope(options: ApplyOptions): SettingsScope {
    if (options.global) {
      return 'global';
    }
    if (options.local) {
      return 'local';
    }
    return 'project';
  }
}
