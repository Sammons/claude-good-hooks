import type {
  GlobalOptionProcessor,
  CommandOptionProcessor,
  GlobalOptionResult,
  CommandOptionResult,
} from './cli-parser/types.js';
import { CommandRegistry } from '../commands/command-registry.js';
import type { HelpInfo } from '../commands/command-registry.js';
import chalk from 'chalk';

// Global option processors
import { JsonOption } from './cli-parser/json-option.js';
import { VerboseOption } from './cli-parser/verbose-option.js';
import { QuietOption } from './cli-parser/quiet-option.js';
import { NoColorOption } from './cli-parser/no-color-option.js';

// Command option processors
import { ListHooksOptions } from './cli-parser/list-hooks-options.js';
import { ApplyOptions } from './cli-parser/apply-options.js';
import { InitOptions } from './cli-parser/init-options.js';
import { ValidateOptions } from './cli-parser/validate-options.js';
import { ExportOptions } from './cli-parser/export-options.js';
import { ImportOptions } from './cli-parser/import-options.js';
import { RestoreOptions } from './cli-parser/restore-options.js';
import { DoctorOptions } from './cli-parser/doctor-options.js';
import { UpdateOptions } from './cli-parser/update-options.js';
import { RemoveOptions } from './cli-parser/remove-options.js';
import { DefaultOptions } from './cli-parser/default-options.js';

export interface CliCommand {
  name: string;
  description: string;
  options?: Record<string, CliOption>;
  arguments?: CliArgument[];
  handler: (args: string[], options: Record<string, unknown>) => Promise<void>;
}

export interface CliOption {
  type: 'boolean' | 'string';
  description: string;
  short?: string;
}

export interface CliArgument {
  name: string;
  description: string;
  required?: boolean;
  variadic?: boolean;
}

export interface ParsedCommand {
  command: string;
  args: string[];
  options: Record<string, unknown>;
  globalOptions: Record<string, unknown>;
}

export interface OptionsWithParent extends Record<string, unknown> {
  parent?: Record<string, unknown>;
}

/**
 * Parse command line arguments using the new polymorphic CLIParser
 */
export function parseCliArgs(argv: string[]): ParsedCommand {
  const parser = new CLIParser();
  return parser.parse(argv);
}

/**
 * Create options object with parent reference for compatibility
 */
export function createOptionsWithParent(
  commandOptions: Record<string, unknown>,
  globalOptions: Record<string, unknown>
): OptionsWithParent {
  return {
    ...commandOptions,
    parent: globalOptions,
  };
}

/**
 * Show help for a specific command or general help
 */
export function showHelp(command?: string): void {
  if (command) {
    showCommandHelp(command);
  } else {
    showGeneralHelp();
  }
}

function showGeneralHelp(): void {
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

  console.log("Run 'claude-good-hooks help <command>' for more information on a command.");
}

function showCommandHelp(command: string): void {
  const commandRegistry = new CommandRegistry();
  const helpInfo = commandRegistry.getCommandHelp(command);

  if (!helpInfo) {
    console.log(`No help available for command: ${command}`);
    return;
  }

  formatHelpInfo(helpInfo);
}

function formatHelpInfo(help: HelpInfo): void {
  console.log(chalk.bold(help.name) + ' - ' + help.description + '\n');

  console.log(chalk.bold('USAGE'));
  console.log('  ' + help.usage + '\n');

  if (help.options && help.options.length > 0) {
    console.log(chalk.bold('OPTIONS'));
    for (const option of help.options) {
      const optionName = `--${option.name}`;
      const typeInfo = option.type === 'string' ? ' <value>' : '';
      const shortInfo = option.short ? `, -${option.short}` : '';
      const padding = ' '.repeat(
        Math.max(0, 20 - optionName.length - typeInfo.length - shortInfo.length)
      );
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
      console.log(`  ${example}\n`);
    }
  }
}

export class CLIParser {
  private globalOptions: GlobalOptionProcessor[] = [
    new JsonOption(),
    new VerboseOption(),
    new QuietOption(),
    new NoColorOption(),
  ];

  private commandOptions: CommandOptionProcessor[] = [
    new ListHooksOptions(),
    new ApplyOptions(),
    new InitOptions(),
    new ValidateOptions(),
    new ExportOptions(),
    new ImportOptions(),
    new RestoreOptions(),
    new DoctorOptions(),
    new UpdateOptions(),
    new RemoveOptions(),
    new DefaultOptions(), // Must be last as it matches many commands
  ];

  parse(argv: string[]): ParsedCommand {
    // Remove node and script paths
    const args = argv.slice(2);

    if (args.length === 0) {
      return {
        command: 'help',
        args: [],
        options: {},
        globalOptions: {},
      };
    }

    // Extract global options first
    const { remainingArgs, options: globalOptions } = this.parseGlobalOptions(args);

    if (remainingArgs.length === 0) {
      return {
        command: 'help',
        args: [],
        options: {},
        globalOptions,
      };
    }

    const command = remainingArgs[0];
    if (command == null) {
      throw new Error('Unexpectedly nullish command argument. This is a bug.');
    }
    const commandArgs = remainingArgs.slice(1);

    // Parse command-specific options
    const { args: finalArgs, options } = this.parseCommandOptions(command, commandArgs);

    return {
      command,
      args: finalArgs,
      options,
      globalOptions,
    };
  }

  private parseGlobalOptions(args: string[]): GlobalOptionResult {
    const options: Record<string, unknown> = {};
    let currentArgs = args;

    while (currentArgs.length > 0) {
      const arg = currentArgs[0];
      if (arg == null) {
        throw new Error('Unexpected nullish arg in args[]. This is a bug.');
      }
      let matched = false;

      // Check each global option processor
      for (const processor of this.globalOptions) {
        if (processor.match(arg)) {
          const result = processor.process(currentArgs, 0);

          // Use key-based approach instead of instanceof checks
          if (result.key) {
            options[result.key] = result.value;
          }

          currentArgs = result.remainingArgs;
          matched = true;

          // Check if we should continue processing (default to true)
          if (result.continueProcessing === false) {
            return { remainingArgs: currentArgs, options };
          }

          break;
        }
      }

      if (!matched) {
        // Stop processing when we hit a non-global option or command
        break;
      }
    }

    return { remainingArgs: currentArgs, options };
  }

  private parseCommandOptions(command: string, args: string[]): CommandOptionResult {
    // Find matching command option processor
    const processor = this.commandOptions.find(p => p.match(command));

    if (processor) {
      return processor.process(args);
    }

    // Fallback for unknown commands
    return { args, options: {} };
  }
}
