import chalk from 'chalk';
import { HookService } from '../../services/hook.service.js';
import type { HelpInfo } from '../command-registry.js';
import type { ApplyOptions } from './apply-options.js';
import { validateApplyCommand } from './apply-options.js';
import { getApplyHelpInfo } from './apply-command-help.js';
import type { ValidationResult } from '../common-validation-types.js';
import type { ApplySubCommand } from './apply-types.js';

// Import all sub-command implementations
import { ApplyRegenerateCommand } from './apply-regenerate.js';
import { ApplyHelpCommand } from './apply-help.js';
import { HookHelpCommand } from './apply-hook-help.js';
import { ApplyHookCommand } from './apply-hook.js';

/**
 * Apply command - apply a hook to the configuration
 * Uses polymorphic pattern for sub-command handling
 */
export class ApplyCommand {
  name = 'apply';
  description = 'Apply a hook to the configuration';

  private hookService: HookService;

  // Polymorphic sub-command handlers - no switch statements needed
  private subCommands: ApplySubCommand[];

  constructor(hookService: HookService) {
    this.hookService = hookService;

    // Initialize sub-commands with shared services
    // Order matters - more specific matches should come first
    this.subCommands = [
      new ApplyRegenerateCommand(this.hookService),
      new HookHelpCommand(this.hookService),
      new ApplyHelpCommand(),
      new ApplyHookCommand(this.hookService),
    ];
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'apply';
  }

  /**
   * Validate command arguments using polymorphic sub-command pattern
   */
  validate(args: string[], options: unknown): ValidationResult<ApplyOptions> {
    // First validate the basic command structure
    const basicValidation = validateApplyCommand(args, options);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    const applyOptions = basicValidation.result;

    // Find matching sub-command and delegate validation
    const subCommand = this.subCommands.find(cmd => cmd.match(args, applyOptions));

    if (!subCommand) {
      return {
        valid: false,
        errors: ['No matching sub-command found for the provided arguments and options'],
      };
    }

    // Delegate validation to the matched sub-command
    return subCommand.validate(args, applyOptions);
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return getApplyHelpInfo();
  }

  /**
   * Execute the apply command using polymorphic sub-command pattern
   */
  async execute(args: string[], options: ApplyOptions): Promise<void> {
    // Find matching sub-command using polymorphic pattern
    const subCommand = this.subCommands.find(cmd => cmd.match(args, options));

    if (!subCommand) {
      // shouldn't be possible because validation should have been run by the consumer first
      const isJson = options.parent?.json;
      if (isJson) {
        console.log(
          JSON.stringify({
            success: false,
            error: 'No matching sub-command found for the provided arguments and options',
          })
        );
      } else {
        console.error(chalk.red('Error: No matching sub-command found'));
      }
      this.processService.exit(1);
      return;
    }

    // Execute the matched sub-command
    await subCommand.execute(args, options);
  }
}
