import { parseArgs } from 'node:util';

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

/**
 * Parse command line arguments using Node.js built-in parseArgs
 */
export function parseCliArgs(argv: string[]): ParsedCommand {
  // Remove node and script paths
  const args = argv.slice(2);
  
  if (args.length === 0) {
    return {
      command: 'help',
      args: [],
      options: {},
      globalOptions: {}
    };
  }

  // Extract global options first
  const globalOptions: Record<string, unknown> = {};
  const remainingArgs: string[] = [];
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--json') {
      globalOptions.json = true;
      i++;
    } else {
      remainingArgs.push(arg);
      i++;
    }
  }

  if (remainingArgs.length === 0) {
    return {
      command: 'help',
      args: [],
      options: {},
      globalOptions
    };
  }

  const command = remainingArgs[0];
  const commandArgs = remainingArgs.slice(1);

  // Parse command-specific options based on the command
  const { args: finalArgs, options } = parseCommandOptions(command, commandArgs);

  return {
    command,
    args: finalArgs,
    options,
    globalOptions
  };
}

/**
 * Parse options for specific commands
 */
function parseCommandOptions(command: string, args: string[]): { args: string[]; options: Record<string, unknown> } {
  switch (command) {
    case 'list-hooks':
      return parseListHooksOptions(args);
    case 'remote':
      return parseRemoteOptions(args);
    case 'apply':
      return parseApplyOptions(args);
    case 'help':
    case 'version':
    case 'doctor':
    case 'update':
    default:
      return { args, options: {} };
  }
}

/**
 * Parse list-hooks command options
 */
function parseListHooksOptions(args: string[]): { args: string[]; options: Record<string, unknown> } {
  try {
    const parsed = parseArgs({
      args,
      options: {
        installed: { type: 'boolean' },
        project: { type: 'boolean' },
        global: { type: 'boolean' },
      },
      allowPositionals: false,
      strict: false
    });

    return {
      args: [],
      options: parsed.values
    };
  } catch {
    return { args, options: {} };
  }
}

/**
 * Parse remote command options
 */
function parseRemoteOptions(args: string[]): { args: string[]; options: Record<string, unknown> } {
  try {
    const parsed = parseArgs({
      args,
      options: {
        add: { type: 'string' },
        remove: { type: 'string' },
        json: { type: 'boolean' },
      },
      allowPositionals: false,
      strict: false
    });

    return {
      args: [],
      options: parsed.values
    };
  } catch {
    return { args, options: {} };
  }
}

/**
 * Parse apply command options
 */
function parseApplyOptions(args: string[]): { args: string[]; options: Record<string, unknown> } {
  // Find the hook name (first non-option argument)
  let hookName = '';
  const remainingArgs: string[] = [];
  const options: Record<string, unknown> = {};
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      if (arg === '--global') {
        options.global = true;
        i++;
      } else if (arg === '--project') {
        options.project = true;
        i++;
      } else if (arg === '--local') {
        options.local = true;
        i++;
      } else if (arg === '--help') {
        options.help = true;
        i++;
      } else {
        // Pass through other options for hook-specific parsing
        remainingArgs.push(arg);
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          remainingArgs.push(args[i + 1]);
          i += 2;
        } else {
          i++;
        }
      }
    } else {
      if (!hookName) {
        hookName = arg;
        i++;
      } else {
        remainingArgs.push(arg);
        i++;
      }
    }
  }

  const finalArgs = hookName ? [hookName, ...remainingArgs] : remainingArgs;
  
  return {
    args: finalArgs,
    options
  };
}

export interface OptionsWithParent extends Record<string, unknown> {
  parent?: Record<string, unknown>;
}

/**
 * Create options object with parent reference for compatibility
 */
export function createOptionsWithParent(commandOptions: Record<string, unknown>, globalOptions: Record<string, unknown>): OptionsWithParent {
  return {
    ...commandOptions,
    parent: globalOptions
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
  console.log(`
claude-good-hooks - CLI for managing Claude Code hooks

USAGE
  claude-good-hooks <command> [options]

COMMANDS
  help                                    Show this help message
  list-hooks [options]                   List available hooks
  remote [options]                       Manage remote hook sources
  apply [options] <hook-name> [args...]  Apply a hook
  update                                  Update claude-good-hooks CLI
  doctor                                  Check system configuration
  version                                 Show version information

GLOBAL OPTIONS
  --json                                 Output in JSON format

Run 'claude-good-hooks help <command>' for more information on a command.
`);
}

function showCommandHelp(command: string): void {
  switch (command) {
    case 'list-hooks':
      console.log(`
list-hooks - List available hooks

USAGE
  claude-good-hooks list-hooks [options]

OPTIONS
  --installed    Show only installed hooks
  --project      Show project-level hooks (default)
  --global       Show global hooks
`);
      break;
    case 'remote':
      console.log(`
remote - Manage remote hook sources

USAGE
  claude-good-hooks remote [options]

OPTIONS
  --add <module>     Add a remote hook module
  --remove <module>  Remove a remote hook module
`);
      break;
    case 'apply':
      console.log(`
apply - Apply a hook

USAGE
  claude-good-hooks apply [options] <hook-name> [args...]

OPTIONS
  --global    Apply globally
  --project   Apply to project (default)
  --local     Apply locally (settings.local.json)
  --help      Show hook-specific help

ARGUMENTS
  <hook-name>  Name of the hook to apply
  [args...]    Hook-specific arguments
`);
      break;
    default:
      console.log(`No help available for command: ${command}`);
  }
}