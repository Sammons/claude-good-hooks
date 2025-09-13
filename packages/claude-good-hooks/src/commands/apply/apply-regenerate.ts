import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { SettingsScope } from '../../services/settings.service.js';
import type { ApplySubCommand } from './apply-types.js';
import type { ApplyOptions } from './apply-options.js';
import type { ValidationResult } from '../common-validation-types.js';

interface HandleRegenerateParams {
  hookName?: string;
  scope?: SettingsScope;
  isJson?: boolean;
}

/**
 * Regenerate sub-command implementation
 */
export class ApplyRegenerateCommand implements ApplySubCommand {
  private hookService: HookService;
  private processService: ProcessService;

  constructor(hookService: HookService, processService: ProcessService) {
    this.hookService = hookService;
    this.processService = processService;
  }

  /**
   * Check if this sub-command handles the given arguments and options
   */
  match(_args: string[], options: ApplyOptions): boolean {
    return Boolean(options.regenerate);
  }

  /**
   * Validate the arguments and options for this sub-command
   */
  validate(_args: string[], options: ApplyOptions): ValidationResult<ApplyOptions> {
    // Regenerate command is valid with or without hook name
    return {
      valid: true,
      result: options,
    };
  }

  /**
   * Execute the regenerate command
   */
  async execute(args: string[], options: ApplyOptions): Promise<void> {
    const scope = this.getScope(options);
    const isJson = options.parent?.json;
    const hookName = args.length > 0 ? args[0] : undefined;

    await this.handleRegenerate({
      hookName,
      scope,
      isJson,
    });
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

  private async handleRegenerate(params: HandleRegenerateParams): Promise<void> {
    const { hookName, scope, isJson } = params;

    try {
      const result = await this.hookService.regenerateHooks(hookName, scope);

      if (isJson) {
        console.log(JSON.stringify(result));
        return;
      }

      // Show results
      if (result.totalProcessed === 0) {
        if (hookName) {
          console.log(
            chalk.yellow(
              `No hooks found matching '${hookName}'${scope ? ` in ${scope} scope` : ''}`
            )
          );
        } else {
          console.log(chalk.yellow('No regenerable hooks found in any settings'));
        }
        return;
      }

      console.log(chalk.bold(`\n🔄 Regenerate Results:`));
      console.log(`Total processed: ${result.totalProcessed}`);
      console.log(`✓ Successful: ${chalk.green(result.successCount.toString())}`);
      console.log(`⚠ Skipped: ${chalk.yellow(result.skippedCount.toString())}`);
      console.log(`✗ Errors: ${chalk.red(result.errorCount.toString())}`);

      // Show detailed results
      for (const hookResult of result.results) {
        const scopeLabel =
          hookResult.scope === 'global'
            ? 'global'
            : hookResult.scope === 'local'
              ? 'local'
              : 'project';
        const prefix = hookResult.success
          ? hookResult.updated
            ? chalk.green('✓')
            : chalk.yellow('⚠')
          : chalk.red('✗');

        console.log(`${prefix} ${hookResult.hookName} (${scopeLabel}/${hookResult.eventName})`);

        if (hookResult.error) {
          console.log(`  ${chalk.dim(hookResult.error)}`);
        }
      }

      if (result.errorCount > 0) {
        this.processService.exit(1);
      }
    } catch (error: unknown) {
      if (isJson) {
        console.log(
          JSON.stringify({
            success: false,
            error: `Failed to regenerate hooks: ${String(error)}`,
          })
        );
      } else {
        console.error(chalk.red(`Failed to regenerate hooks: ${String(error)}`));
      }
      this.processService.exit(1);
    }
  }
}
