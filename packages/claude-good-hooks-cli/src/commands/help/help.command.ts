import chalk from 'chalk';
import { CommandRegistry } from '../command-registry.js';
import type { HelpInfo } from '../command-registry.js';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

interface HelpOptions {
  parent?: {
    json?: boolean;
  };
}

/**
 * Help command - shows usage information and available commands
 */
export class HelpCommand {
  name = 'help';
  description = 'Show help information';

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'help' || command === '--help' || command === '-h';
  }

  /**
   * Validate command arguments - help doesn't require any validation
   */
  validate(_args: string[], _options: any): boolean | ValidationResult {
    return true;
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks help [command]',
      arguments: [
        {
          name: 'command',
          description: 'Command to show help for',
          required: false
        }
      ]
    };
  }

  /**
   * Execute the help command
   */
  async execute(args: string[], options: HelpOptions): Promise<void> {
    const isJson = options.parent?.json;
    const commandRegistry = new CommandRegistry();

    if (args.length > 0) {
      // Show help for a specific command
      const command = args[0];
      const helpInfo = commandRegistry.getCommandHelp(command!);

      if (!helpInfo) {
        console.log(`No help available for command: ${command}`);
        return;
      }

      if (isJson) {
        console.log(JSON.stringify(helpInfo, null, 2));
      } else {
        this.formatHelpInfo(helpInfo);
      }
    } else {
      // Show general help
      if (isJson) {
        const generalHelp = commandRegistry.getGeneralHelp();
        const commandsObj = generalHelp.commands.reduce((acc, cmd) => {
          acc[cmd.name] = cmd.description;
          return acc;
        }, {} as Record<string, string>);

        console.log(JSON.stringify({ commands: commandsObj }));
      } else {
        this.showGeneralHelp();
      }
    }
  }

  /**
   * Show general help information
   */
  private showGeneralHelp(): void {
    const commandRegistry = new CommandRegistry();
    const generalHelp = commandRegistry.getGeneralHelp();

    console.log(chalk.bold('claude-good-hooks') + ' - CLI for managing Claude Code hooks\n');
    
    console.log(chalk.bold('USAGE'));
    console.log('  claude-good-hooks <command> [options]\n');
    
    console.log(chalk.bold('COMMANDS'));
    for (const cmd of generalHelp.commands) {
      const padding = ' '.repeat(Math.max(0, 42 - cmd.name.length));
      console.log(`  ${chalk.cyan(cmd.name)}${padding}${cmd.description}`);
    }
    console.log('');
    
    console.log(chalk.bold('GLOBAL OPTIONS'));
    console.log('  --json                                 Output in JSON format');
    console.log('  --verbose                              Enable verbose logging');
    console.log('  --quiet                                Enable quiet mode (errors only)');
    console.log('  --no-color                             Disable colored output\n');
    
    console.log(chalk.bold('EXAMPLES'));
    console.log(`  ${chalk.dim('# List all available hooks')}`);
    console.log(`  claude-good-hooks list-hooks`);
    console.log(`  ${chalk.dim('# Install and apply the dirty hook')}`);
    console.log(`  npm install -g @sammons/dirty-good-claude-hook`);
    console.log(`  claude-good-hooks apply --global dirty`);
    console.log(`  ${chalk.dim('# Apply hook with custom arguments')}`);
    console.log(`  claude-good-hooks apply --project dirty --staged --filenames`);
    console.log(`  ${chalk.dim('# Check system configuration')}`);
    console.log(`  claude-good-hooks doctor\n`);
    
    console.log("Run 'claude-good-hooks help <command>' for more information on a command.");
  }

  /**
   * Format help information for a specific command
   */
  private formatHelpInfo(help: HelpInfo): void {
    console.log(chalk.bold(help.name) + ' - ' + help.description + '\n');
    
    console.log(chalk.bold('USAGE'));
    console.log('  ' + help.usage + '\n');
    
    if (help.options && help.options.length > 0) {
      console.log(chalk.bold('OPTIONS'));
      for (const option of help.options) {
        const optionName = `--${option.name}`;
        const typeInfo = option.type === 'string' ? ' <value>' : '';
        const shortInfo = option.short ? `, -${option.short}` : '';
        const padding = ' '.repeat(Math.max(0, 20 - optionName.length - typeInfo.length - shortInfo.length));
        console.log(`  ${optionName}${typeInfo}${shortInfo}${padding}${option.description}`);
      }
      console.log('');
    }
    
    if (help.arguments && help.arguments.length > 0) {
      console.log(chalk.bold('ARGUMENTS'));
      for (const arg of help.arguments) {
        const argName = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
        const variadic = arg.variadic ? '...' : '';
        const padding = ' '.repeat(Math.max(0, 20 - argName.length - variadic.length));
        console.log(`  ${argName}${variadic}${padding}${arg.description}`);
      }
      console.log('');
    }
    
    if (help.examples && help.examples.length > 0) {
      console.log(chalk.bold('EXAMPLES'));
      for (const example of help.examples) {
        console.log(`  ${chalk.dim('# ' + example)}`);
        console.log(`  ${example}`);
      }
      console.log('');
    }
  }
}