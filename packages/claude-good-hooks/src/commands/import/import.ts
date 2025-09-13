import chalk from 'chalk';
import { SettingsService } from '../../services/settings.service.js';
import type { HelpInfo } from '../command-registry.js';
import type { ImportOptions } from './import-options.js';
import { validateImportCommand } from './import-options.js';
import { getImportHelpInfo } from './import-command-help.js';
import type { ValidationResult } from '../common-validation-types.js';
import type { ImportSubCommand } from './import-types.js';

// Import all sub-command implementations
import { ImportHelpCommand } from './import-help.js';
import { ImportFileCommand } from './import-file.js';

/**
 * Import command - import Claude hooks configuration from file or URL
 * Uses polymorphic pattern for sub-command handling
 */
export class ImportCommand {
  name = 'import';
  description = 'Import Claude hooks configuration from file or URL';

  private settingsService: SettingsService;

  // Polymorphic sub-command handlers - no switch statements needed
  private subCommands: ImportSubCommand[];

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;

    // Initialize sub-commands with shared services
    // Order matters - more specific matches should come first
    this.subCommands = [new ImportHelpCommand(), new ImportFileCommand(this.settingsService)];
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'import';
  }

  /**
   * Validate command arguments using polymorphic sub-command pattern
   */
  validate(args: string[], options: unknown): ValidationResult<ImportOptions> {
    // First validate the basic command structure
    const basicValidation = validateImportCommand(args, options);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    const importOptions = basicValidation.result;

    // Find matching sub-command and delegate validation
    const subCommand = this.subCommands.find(cmd => cmd.match(args, importOptions));

    if (!subCommand) {
      return {
        valid: false,
        errors: ['No matching sub-command found for the provided arguments and options'],
      };
    }

    // Delegate validation to the matched sub-command
    return subCommand.validate(args, importOptions);
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return getImportHelpInfo();
  }

  /**
   * Execute the import command using polymorphic sub-command pattern
   */
  async execute(args: string[], options: ImportOptions): Promise<void> {
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
      process.exit(1);
      return;
    }

    // Execute the matched sub-command
    await subCommand.execute(args, options);
  }
}
