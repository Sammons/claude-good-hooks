/**
 * Result of processing an option
 */
export interface OptionResult {
  /** The remaining arguments after processing this option */
  remainingArgs: string[];
  /** The parsed value for this option */
  value: unknown;
  /** The key in the options object (optional for global options) */
  key?: string;
  /** Whether to continue processing other options */
  continueProcessing?: boolean;
}

/**
 * Result of processing global options
 */
export interface GlobalOptionResult {
  /** Remaining arguments after processing global options */
  remainingArgs: string[];
  /** Global options that were parsed */
  options: Record<string, unknown>;
}

/**
 * Result of processing command-specific options
 */
export interface CommandOptionResult {
  /** Remaining arguments after option processing */
  args: string[];
  /** Command-specific options that were parsed */
  options: Record<string, unknown>;
}

/**
 * Base interface for global option processors
 * Global options are processed first and apply to all commands
 */
export interface GlobalOptionProcessor {
  match(arg: string): boolean;
  process(args: string[], index: number): OptionResult;
}

/**
 * Base interface for command option processors
 * Command options are command-specific and processed after global options
 */
export interface CommandOptionProcessor {
  match(command: string): boolean;
  process(args: string[]): CommandOptionResult;
}
