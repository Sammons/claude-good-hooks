import chalk from 'chalk';
import type { HelpInfo } from '../command-registry.js';
import type { ValidateOptions } from './validate-options.js';
import { validateValidateCommand } from './validate-options.js';
import { getValidateHelpInfo } from './validate-command-help.js';
import type { ValidationResult } from '../common-validation-types.js';
import type { ValidateSubCommand } from './validate-types.js';

// Import all sub-command implementations
import { ValidateHelpCommand } from './validate-help.js';
import { ValidateCheckCommand } from './validate-check.js';

/**
 * Validate command - validate hooks configuration
 * Uses polymorphic pattern for sub-command handling
 */
export class ValidateCommand {
  name = 'validate';
  description = 'Validate hooks configuration';


  // Polymorphic sub-command handlers - no switch statements needed
  private subCommands: ValidateSubCommand[];

  constructor() {

    // Initialize sub-commands with shared services
    // Order matters - more specific matches should come first
    this.subCommands = [new ValidateCheckCommand(), new ValidateHelpCommand()];
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'validate';
  }

  /**
   * Validate command arguments using polymorphic sub-command pattern
   */
  validate(args: string[], options: unknown): ValidationResult<ValidateOptions> {
    // First validate the basic command structure
    const basicValidation = validateValidateCommand(args, options);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    const validateOptions = basicValidation.result;

    // Find matching sub-command and delegate validation
    const subCommand = this.subCommands.find(cmd => cmd.match(args, validateOptions));

    if (!subCommand) {
      return {
        valid: false,
        errors: ['No matching sub-command found for the provided arguments and options'],
      };
    }

    // Delegate validation to the matched sub-command
    return subCommand.validate(args, validateOptions);
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return getValidateHelpInfo();
  }

  /**
   * Execute the validate command using polymorphic sub-command pattern
   */
  async execute(args: string[], options: ValidateOptions): Promise<void> {
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
