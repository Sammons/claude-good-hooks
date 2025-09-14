import chalk from 'chalk';
import { SettingsService } from '../../services/settings.service.js';
import type { HelpInfo } from '../command-types.js';
import type { ExportOptions } from './export-options.js';
import { validateExportCommand } from './export-options.js';
import type { ValidationResult } from '../common-validation-types.js';
import type { ExportSubCommand } from './export-types.js';

// Import all sub-command implementations
import { ExportHelpCommand } from './export-help.js';
import { ExportBackupCommand } from './export-backup.js';
import { ExportFileCommand } from './export-file.js';

/**
 * Export command - export Claude hooks configuration to shareable format
 * Uses polymorphic pattern for sub-command handling
 */
export class ExportCommand {
  name = 'export';
  description = 'Export Claude hooks configuration to shareable format';

  private settingsService: SettingsService;

  // Polymorphic sub-command handlers - no switch statements needed
  private subCommands: ExportSubCommand[];

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;

    // Initialize sub-commands with shared services
    // Order matters - more specific matches should come first
    this.subCommands = [
      new ExportHelpCommand(),
      new ExportBackupCommand(this.settingsService),
      new ExportFileCommand(this.settingsService),
    ];
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'export';
  }

  /**
   * Validate command arguments using polymorphic sub-command pattern
   */
  validate(args: string[], options: unknown): ValidationResult<ExportOptions> {
    // First validate the basic command structure
    const basicValidation = validateExportCommand(args, options);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    const exportOptions = basicValidation.result;

    // Find matching sub-command and delegate validation
    const subCommand = this.subCommands.find(cmd => cmd.match(args, exportOptions));

    if (!subCommand) {
      return {
        valid: false,
        errors: ['No matching sub-command found for the provided arguments and options'],
      };
    }

    // Delegate validation to the matched sub-command
    return subCommand.validate(args, exportOptions);
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks export [options]',
      options: [
        {
          name: 'output',
          description: 'Output file path',
          type: 'string',
        },
        {
          name: 'scope',
          description: 'Configuration scope to export (project|global|local|all)',
          type: 'string',
        },
        {
          name: 'format',
          description: 'Export format (json|yaml|template)',
          type: 'string',
        },
        {
          name: 'minify',
          description: 'Minify output',
          type: 'boolean',
        },
        {
          name: 'include-metadata',
          description: 'Include export metadata',
          type: 'boolean',
        },
        {
          name: 'backup',
          description: 'Save as timestamped backup in .claude directory',
          type: 'boolean',
        },
        {
          name: 'help',
          description: 'Show help for this command',
          type: 'boolean',
        },
      ],
      examples: [
        'claude-good-hooks export',
        'claude-good-hooks export --scope=all --format=yaml',
        'claude-good-hooks export --output=my-hooks.json --scope=project',
        'claude-good-hooks export --format=template --output=hooks-template.json',
        'claude-good-hooks export --backup --scope=project',
      ],
    };
  }

  /**
   * Execute the export command using polymorphic sub-command pattern
   */
  async execute(args: string[], options: ExportOptions): Promise<void> {
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
