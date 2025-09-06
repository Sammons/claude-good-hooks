import chalk from 'chalk';
import { FileSystemService } from '../../services/file-system.service.js';
import { ProcessService } from '../../services/process.service.js';
import type { HelpInfo } from '../command-registry.js';
import type { RestoreOptions } from './restore-options.js';
import { validateRestoreCommand } from './restore-options.js';
import { getRestoreHelpInfo } from './restore-command-help.js';
import type { ValidationResult } from '../common-validation-types.js';
import type { RestoreSubCommand } from './restore-types.js';

// Import all sub-command implementations
import { RestoreHelpCommand } from './restore-help.js';
import { RestoreLatestCommand } from './restore-latest.js';
import { RestoreFileCommand } from './restore-file.js';

/**
 * Restore command - restore Claude hooks configuration from backup files
 * Uses polymorphic pattern for sub-command handling
 */
export class RestoreCommand {
  name = 'restore';
  description = 'Restore Claude hooks configuration from backup files';
  
  private fileSystemService: FileSystemService;
  private processService: ProcessService;

  // Polymorphic sub-command handlers - no switch statements needed
  private subCommands: RestoreSubCommand[];

  constructor(
    fileSystemService: FileSystemService,
    processService: ProcessService
  ) {
    this.fileSystemService = fileSystemService;
    this.processService = processService;
    
    // Initialize sub-commands with shared services
    // Order matters - more specific matches should come first
    this.subCommands = [
      new RestoreLatestCommand(this.fileSystemService, this.processService),
      new RestoreHelpCommand(),
      new RestoreFileCommand(this.fileSystemService, this.processService),
    ];
  }

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'restore';
  }

  /**
   * Validate command arguments using polymorphic sub-command pattern
   */
  validate(args: string[], options: unknown): ValidationResult<RestoreOptions> {
    // First validate the basic command structure
    const basicValidation = validateRestoreCommand(args, options);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    const restoreOptions = basicValidation.result;

    // Find matching sub-command and delegate validation
    const subCommand = this.subCommands.find(cmd => cmd.match(args, restoreOptions));
    
    if (!subCommand) {
      return {
        valid: false,
        errors: ['No matching sub-command found for the provided arguments and options']
      };
    }

    // Delegate validation to the matched sub-command
    return subCommand.validate(args, restoreOptions);
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return getRestoreHelpInfo();
  }

  /**
   * Execute the restore command using polymorphic sub-command pattern
   */
  async execute(args: string[], options: RestoreOptions): Promise<void> {
    // Find matching sub-command using polymorphic pattern
    const subCommand = this.subCommands.find(cmd => cmd.match(args, options));
    
    if (!subCommand) {
      // shouldn't be possible because validation should have been run by the consumer first
      const isJson = options.parent?.json;
      if (isJson) {
        console.log(JSON.stringify({ 
          success: false, 
          error: 'No matching sub-command found for the provided arguments and options' 
        }));
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