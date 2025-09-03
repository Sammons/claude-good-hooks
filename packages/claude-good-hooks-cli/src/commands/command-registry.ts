// Import command classes
import { HelpCommand } from './help/help.command.js';
import { InitCommand } from './init/init.command.js';
import { VersionCommand } from './version/version.command.js';
import { ApplyCommand } from './apply/apply.command.js';
import { ListHooksCommand } from './list-hooks/list-hooks.command.js';
import { RemoteCommand } from './remote/remote.command.js';
import { ValidateCommand } from './validate/validate.command.js';
import { UpdateCommand } from './update/update.command.js';
import { DoctorCommand } from './doctor/doctor.command.js';
import { ExportCommand } from './export/export.command.js';
import { ImportCommand } from './import/import.command.js';
import { DebugCommand } from './debug/debug.command.js';
import { PerformanceCommand } from './performance/performance.command.js';

// Help information structure
export interface HelpInfo {
  name: string;
  description: string;
  usage?: string;
  options?: Array<{
    name: string;
    description: string;
    type?: 'boolean' | 'string';
    short?: string;
  }>;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
    variadic?: boolean;
  }>;
  examples?: string[];
}

// Command interface for duck typing
export interface CommandLike {
  name?: string;
  description?: string;
  match(command: string): boolean;
  validate(args: string[], options: any): boolean | any;
  execute(args: string[], options: any): Promise<void>;
  getHelp(): HelpInfo;
}

/**
 * Command registry that manages all available CLI commands
 */
export class CommandRegistry {
  private commands: CommandLike[];

  constructor() {
    // Initialize all command instances
    this.commands = [
      new HelpCommand(),
      new InitCommand(), 
      new VersionCommand(),
      new ApplyCommand(),
      new ListHooksCommand(),
      new RemoteCommand(),
      new ValidateCommand(),
      new UpdateCommand(),
      new DoctorCommand(),
      new ExportCommand(),
      new ImportCommand(),
      new DebugCommand(),
      new PerformanceCommand(),
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
  getGeneralHelp(): { commands: Array<{ name: string; description: string; }> } {
    return {
      commands: this.commands.map(cmd => {
        const help = cmd.getHelp();
        return {
          name: help.name,
          description: help.description
        };
      })
    };
  }
}