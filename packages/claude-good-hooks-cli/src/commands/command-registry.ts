// Import command classes
import { HelpCommand } from './help/help.js';
import { InitCommand } from './init/init.js';
import { VersionCommand } from './version/version.js';
import { ApplyCommand } from './apply/apply.js';
import { ListHooksCommand } from './list-hooks/list-hooks.js';
import { RemoteCommand } from './remote/remote.js';
import { ValidateCommand } from './validate/validate.js';
import { UpdateCommand } from './update/update.js';
import { DoctorCommand } from './doctor/doctor.js';
import { ExportCommand } from './export/export.js';
import { ImportCommand } from './import/import.js';
import { RestoreCommand } from './restore/restore.js';
import { DebugCommand } from './debug/debug.js';
import { PerformanceCommand } from './performance/performance.js';

// Import services needed by commands
import { HookService } from '../services/hook.service.js';
import { ProcessService } from '../services/process.service.js';
import { SettingsService } from '../services/settings.service.js';
import { FileSystemService } from '../services/file-system.service.js';
import { ConsoleService } from '../services/console.service.js';

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
  private hookService: HookService;
  private processService: ProcessService;
  private settingsService: SettingsService;
  private fileSystemService: FileSystemService;
  private consoleService: ConsoleService;

  constructor() {
    // Initialize shared services
    this.hookService = new HookService();
    this.processService = new ProcessService();
    this.settingsService = new SettingsService();
    this.fileSystemService = new FileSystemService();
    this.consoleService = new ConsoleService();
    
    // Initialize all command instances
    this.commands = [
      new HelpCommand(),
      new InitCommand(this.settingsService, this.processService), 
      new VersionCommand(),
      new ApplyCommand(this.hookService, this.processService),
      new ListHooksCommand(),
      new RemoteCommand(),
      new ValidateCommand(this.processService),
      new UpdateCommand(),
      new DoctorCommand(),
      new ExportCommand(this.settingsService, this.fileSystemService, this.processService),
      new ImportCommand(this.settingsService, this.processService),
      new RestoreCommand(this.fileSystemService, this.processService),
      new DebugCommand(this.consoleService, this.processService),
      new PerformanceCommand(this.consoleService, this.processService),
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