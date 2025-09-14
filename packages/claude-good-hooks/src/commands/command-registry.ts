// Import shared command types
import type { HelpInfo, CommandLike } from './command-types.js';

// Import command classes
import { HelpCommand } from './help/help.js';
import { VersionCommand } from './version/version.js';
import { ApplyCommand } from './apply/apply.js';
import { ListHooksCommand } from './list-hooks/list-hooks.js';
import { ValidateCommand } from './validate/validate.js';
import { UpdateCommand } from './update/update.js';
import { DoctorCommand } from './doctor/doctor.js';
import { ExportCommand } from './export/export.js';
import { ImportCommand } from './import/import.js';
import { RemoveCommand } from './remove/remove.js';

// Import services needed by commands
import { HookService } from '../services/hook.service.js';
import { SettingsService } from '../services/settings.service.js';

/**
 * Command registry that manages all available CLI commands
 */
export class CommandRegistry {
  private commands: CommandLike[];
  private hookService: HookService;
  private settingsService: SettingsService;

  constructor() {
    // Initialize shared services
    this.hookService = new HookService();
    this.settingsService = new SettingsService();

    // Initialize all command instances
    this.commands = [
      new HelpCommand(() => this.getAllCommands()),
      new VersionCommand(),
      new ApplyCommand(this.hookService),
      new ListHooksCommand(),
      new ValidateCommand(),
      new UpdateCommand(),
      new DoctorCommand(),
      new ExportCommand(this.settingsService),
      new ImportCommand(this.settingsService),
      new RemoveCommand(this.settingsService),
    ];
  }

  /**
   * Find a command that matches the given command string
   */
  findCommand(commandString: string): CommandLike | undefined {
    return this.commands.find(cmd => cmd.match(commandString));
  }

  /**
   * Get all available commands
   */
  getAllCommands(): CommandLike[] {
    return [...this.commands];
  }

  /**
   * Get help information for a specific command
   */
  getCommandHelp(commandName: string): HelpInfo | undefined {
    const command = this.findCommand(commandName);
    return command?.getHelp();
  }

  /**
   * Get general help information for all commands
   */
  getGeneralHelp(): { commands: Array<{ name: string; description: string }> } {
    return {
      commands: this.commands.map(cmd => {
        const help = cmd.getHelp();
        return {
          name: help.name,
          description: help.description,
        };
      }),
    };
  }
}
