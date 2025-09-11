import { SettingsService } from '../../services/settings.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { HelpInfo } from '../command-registry.js';
import type { InitOptions } from './init-options.js';
import { validateInitCommand } from './init-options.js';
import { getInitHelpInfo } from './init-command-help.js';
import type { ValidationResult } from '../common-validation-types.js';
import type { InitSubCommand } from './init-types.js';

// Import all sub-command implementations
import { InitHelpCommand } from './init-help.js';
import { InitCreateCommand } from './init-create.js';

/**
 * Init command - initialize Claude hooks configuration for a project
 * Uses polymorphic pattern for sub-command handling
 */
export class InitCommand {
  name = 'init';
  description = 'Initialize Claude hooks configuration for a project';

  private settingsService: SettingsService;
  private processService: ProcessService;

  // Polymorphic sub-command handlers - no switch statements needed
  private subCommands: InitSubCommand[];

  constructor(settingsService: SettingsService, processService: ProcessService) {
    this.settingsService = settingsService;
    this.processService = processService;

    // Initialize sub-commands with shared services
    // Order matters - more specific matches should come first
    this.subCommands = [
      new InitHelpCommand(),
      new InitCreateCommand(this.settingsService, this.processService),
    ];
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'init';
  }

  /**
   * Validate command arguments using polymorphic sub-command pattern
   */
  validate(args: string[], options: unknown): ValidationResult<InitOptions> {
    // First validate the basic command structure
    const basicValidation = validateInitCommand(args, options);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    const initOptions = basicValidation.result;

    // Find matching sub-command and delegate validation
    const subCommand = this.subCommands.find(cmd => cmd.match(args, initOptions));

    if (!subCommand) {
      return {
        valid: false,
        errors: ['No matching sub-command found for the provided arguments and options'],
      };
    }

    // Delegate validation to the matched sub-command
    return subCommand.validate(args, initOptions);
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return getInitHelpInfo();
  }

  /**
   * Execute the init command using polymorphic sub-command pattern
   */
  async execute(args: string[], options: InitOptions): Promise<void> {
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
        console.error('Error: No matching sub-command found');
      }
      this.processService.exit(1);
      return;
    }

    // Execute the matched sub-command
    await subCommand.execute(args, options);
  }
}
