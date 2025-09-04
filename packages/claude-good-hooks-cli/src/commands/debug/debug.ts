/**
 * Debug command implementation for Claude Good Hooks CLI
 * 
 * Provides debugging, profiling, and diagnostic tools for hooks
 * Refactored to use polymorphic pattern instead of switch statements
 */

import type { HelpInfo } from '../command-registry.js';
import type { DebugOptions, DebugSubCommand, ValidationResult } from './debug-types.js';
import { DebugOptionsHandler } from './debug-options.js';

// Import all sub-command implementations
import { EnableDebuggingCommand } from './debug-sub-commands/enable-debugging.js';
import { DisableDebuggingCommand } from './debug-sub-commands/disable-debugging.js';
import { ShowDebugStatusCommand } from './debug-sub-commands/show-debug-status.js';
import { DebugTraceCommand } from './debug-sub-commands/debug-trace.js';
import { DebugProfileCommand } from './debug-sub-commands/debug-profile.js';
import { DebugReportCommand } from './debug-sub-commands/debug-report.js';
import { DebugLogsCommand } from './debug-sub-commands/debug-logs.js';
import { DebugAnalyzeCommand } from './debug-sub-commands/debug-analyze.js';
import { DebugBreakpointCommand } from './debug-sub-commands/debug-breakpoint.js';

/**
 * Debug command - debugging, profiling, and diagnostic tools for hooks
 * Uses polymorphic pattern for sub-command handling
 */
export class DebugCommand {
  name = 'debug';
  description = 'Debugging, profiling, and diagnostic tools for hooks';

  // Polymorphic sub-command handlers - no switch statements needed
  private subCommands: DebugSubCommand[] = [
    new EnableDebuggingCommand(),
    new DisableDebuggingCommand(),
    new ShowDebugStatusCommand(),
    new DebugTraceCommand(),
    new DebugProfileCommand(),
    new DebugReportCommand(),
    new DebugLogsCommand(),
    new DebugAnalyzeCommand(),
    new DebugBreakpointCommand(),
  ];

  constructor() {}

  /**
   * Check if this command handles the given input
   */
  match(command: string): boolean {
    return command === 'debug';
  }

  /**
   * Validate command arguments using the options handler
   */
  validate(args: string[], options: DebugOptions): boolean | ValidationResult {
    return DebugOptionsHandler.validate(args, options);
  }

  /**
   * Get help information for this command
   */
  getHelp(): HelpInfo {
    return {
      name: this.name,
      description: this.description,
      usage: 'claude-good-hooks debug <subcommand> [options]',
      options: [
        {
          name: 'help',
          description: 'Show this help message',
          type: 'boolean'
        },
        {
          name: 'trace',
          description: 'Enable tracing when enabling debug',
          type: 'boolean'
        },
        {
          name: 'profile',
          description: 'Enable profiling when enabling debug',
          type: 'boolean'
        },
        {
          name: 'breakpoint',
          description: 'Set breakpoint when enabling debug',
          type: 'boolean'
        },
        {
          name: 'output',
          description: 'Output file for logs/reports',
          type: 'string'
        },
        {
          name: 'log-level',
          description: 'Log level (debug|info|warn|error)',
          type: 'string'
        },
        {
          name: 'interactive',
          description: 'Enable interactive breakpoints',
          type: 'boolean'
        },
        {
          name: 'json',
          description: 'Output in JSON format (for status)',
          type: 'boolean'
        }
      ],
      arguments: [
        {
          name: 'subcommand',
          description: 'Debug subcommand',
          required: true
        }
      ],
      examples: [
        'claude-good-hooks debug enable my-hook --trace --profile',
        'claude-good-hooks debug status --json',
        'claude-good-hooks debug trace --output ./trace.log',
        'claude-good-hooks debug report performance --output ./perf-report.txt',
        'claude-good-hooks debug breakpoint my-hook "file.endsWith(\'.ts\')"',
        'claude-good-hooks debug analyze abc123-def456'
      ]
    };
  }

  /**
   * Execute the debug command using polymorphic sub-command pattern
   */
  async execute(args: string[], options: DebugOptions): Promise<void> {
    if (options.help || args.length === 0) {
      this.showDebugHelp();
      return;
    }

    const subcommand = args[0]!;
    
    // Use polymorphic pattern instead of switch statement
    const subCommand = this.subCommands.find(cmd => cmd.match(subcommand));
    
    if (!subCommand) {
      console.error(`Error: Unknown debug subcommand: ${subcommand}`);
      console.error('Run "claude-good-hooks debug --help" for usage information');
      process.exit(1);
    }

    // Merge options with defaults and execute the matched sub-command
    const mergedOptions = DebugOptionsHandler.mergeOptions(options);
    await subCommand.execute(args, mergedOptions);
  }

  /**
   * Show help information
   */
  private showDebugHelp(): void {
    console.log(`
Claude Good Hooks Debug Tool

Usage:
  claude-good-hooks debug <command> [options]

Commands:
  enable <hook>       Enable debugging for a specific hook
  disable [hook]      Disable debugging (for specific hook or all hooks)
  status              Show current debugging status
  trace               Enable execution tracing
  profile             Enable performance profiling
  report [type]       Generate debug report (summary|performance|errors|trace)
  logs                Show debug logs
  analyze [id]        Analyze hook execution (show recent or specific)
  breakpoint <hook>   Set debugging breakpoint

Options:
  --help              Show this help message
  --trace             Enable tracing when enabling debug
  --profile           Enable profiling when enabling debug
  --breakpoint        Set breakpoint when enabling debug
  --output <file>     Output file for logs/reports
  --log-level <level> Log level (debug|info|warn|error)
  --interactive       Enable interactive breakpoints
  --json              Output in JSON format (for status)

Examples:
  claude-good-hooks debug enable my-hook --trace --profile
  claude-good-hooks debug status --json
  claude-good-hooks debug trace --output ./trace.log
  claude-good-hooks debug report performance --output ./perf-report.txt
  claude-good-hooks debug breakpoint my-hook "file.endsWith('.ts')"
  claude-good-hooks debug analyze abc123-def456
`);
  }
}