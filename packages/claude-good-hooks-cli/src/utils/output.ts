import chalk from 'chalk';

/**
 * Output mode utilities for consistent CLI output across all commands
 */

export interface OutputOptions {
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  noColor?: boolean;
  level?: LogLevel;
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  log(level: LogLevel, message: string, ...args: unknown[]): void;
}

/**
 * Logger implementation with support for different output modes
 */
export class ConsoleLogger implements Logger {
  private options: Required<OutputOptions>;

  constructor(options: OutputOptions = {}) {
    this.options = {
      verbose: options.verbose || false,
      quiet: options.quiet || false,
      json: options.json || false,
      noColor: options.noColor || false,
      level:
        options.level ||
        (options.verbose ? LogLevel.DEBUG : options.quiet ? LogLevel.ERROR : LogLevel.INFO),
    };

    // Disable chalk colors if requested or if not in TTY
    if (this.options.noColor || !process.stdout.isTTY) {
      chalk.level = 0;
    }
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  trace(message: string, ...args: unknown[]): void {
    this.log(LogLevel.TRACE, message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage('success', message, ...args);
      console.log(formattedMessage);
    }
  }

  log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(this.getLevelName(level), message, ...args);

    if (level === LogLevel.ERROR) {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.options.level;
  }

  private getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.TRACE:
        return 'trace';
      default:
        return 'info';
    }
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    if (this.options.json) {
      return JSON.stringify({
        level,
        message,
        args: args.length > 0 ? args : undefined,
        timestamp: new Date().toISOString(),
      });
    }

    const coloredLevel = this.colorizeLevel(level);
    const prefix = this.options.verbose ? `[${coloredLevel}] ` : '';
    const formattedArgs =
      args.length > 0
        ? ` ${args
            .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ')}`
        : '';

    return `${prefix}${message}${formattedArgs}`;
  }

  private colorizeLevel(level: string): string {
    switch (level) {
      case 'error':
        return chalk.red('ERROR');
      case 'warn':
        return chalk.yellow('WARN');
      case 'info':
        return chalk.blue('INFO');
      case 'debug':
        return chalk.gray('DEBUG');
      case 'trace':
        return chalk.gray('TRACE');
      case 'success':
        return chalk.green('SUCCESS');
      default:
        return level.toUpperCase();
    }
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger = new ConsoleLogger();

/**
 * Configure the global logger
 */
export function configureLogger(options: OutputOptions): void {
  globalLogger = new ConsoleLogger(options);
}

/**
 * Get the current logger instance
 */
export function getLogger(): Logger {
  return globalLogger;
}

/**
 * Output utilities for structured data
 */
export interface OutputFormatter {
  table(data: Record<string, unknown>[], options?: TableOptions): void;
  list(items: string[], options?: ListOptions): void;
  json(data: unknown, options?: JsonOptions): void;
  yaml(data: unknown, options?: YamlOptions): void;
}

export interface TableOptions {
  headers?: string[];
  align?: ('left' | 'center' | 'right')[];
  compact?: boolean;
}

export interface ListOptions {
  bullet?: string;
  indent?: number;
  numbered?: boolean;
}

export interface JsonOptions {
  pretty?: boolean;
  indent?: number;
}

export interface YamlOptions {
  indent?: number;
}

/**
 * Output formatter implementation
 */
export class ConsoleOutputFormatter implements OutputFormatter {
  private options: OutputOptions;

  constructor(options: OutputOptions = {}) {
    this.options = options;
  }

  table(data: Record<string, unknown>[], options: TableOptions = {}): void {
    if (this.options.json) {
      this.json(data);
      return;
    }

    if (data.length === 0) {
      getLogger().info('No data to display');
      return;
    }

    const firstRow = data[0];
    if (!firstRow) {
      getLogger().info('No data to display');
      return;
    }

    const headers = options.headers || Object.keys(firstRow);
    const compact = options.compact || false;

    // Calculate column widths
    const widths: Record<string, number> = {};
    headers.forEach(header => {
      widths[header] = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
    });

    // Print header
    const headerRow = headers
      .map(header => this.padString(chalk.bold(header), widths[header] || 0))
      .join(compact ? ' | ' : '  ');
    console.log(headerRow);

    // Print separator
    if (!compact) {
      const separator = headers.map(header => '-'.repeat(widths[header] || 0)).join('  ');
      console.log(separator);
    }

    // Print data rows
    data.forEach(row => {
      const dataRow = headers
        .map(header => this.padString(String(row[header] || ''), widths[header] || 0))
        .join(compact ? ' | ' : '  ');
      console.log(dataRow);
    });
  }

  list(items: string[], options: ListOptions = {}): void {
    if (this.options.json) {
      this.json(items);
      return;
    }

    const bullet = options.bullet || '•';
    const indent = ' '.repeat(options.indent || 2);
    const numbered = options.numbered || false;

    items.forEach((item, index) => {
      const prefix = numbered ? `${index + 1}.` : bullet;
      console.log(`${indent}${prefix} ${item}`);
    });
  }

  json(data: unknown, options: JsonOptions = {}): void {
    const pretty = options.pretty !== false;
    const indent = options.indent || 2;

    if (pretty) {
      console.log(JSON.stringify(data, null, indent));
    } else {
      console.log(JSON.stringify(data));
    }
  }

  yaml(data: unknown, options: YamlOptions = {}): void {
    // Simple YAML-like output for basic objects
    // For production use, consider using a proper YAML library
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const indent = ' '.repeat(options.indent || 2);
      const entries = Object.entries(data as Record<string, unknown>);

      entries.forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          console.log(`${key}:`);
          console.log(`${indent}${JSON.stringify(value, null, 2).split('\n').join(`\n${indent}`)}`);
        } else {
          console.log(`${key}: ${value}`);
        }
      });
    } else {
      // Fallback to JSON for complex structures
      this.json(data, options);
    }
  }

  private padString(str: string, width: number): string {
    // Handle ANSI escape codes when calculating padding
    const visibleLength = str.replace(/\x1b\[[0-9;]*m/g, '').length;
    const padding = Math.max(0, width - visibleLength);
    return str + ' '.repeat(padding);
  }
}

/**
 * Global output formatter instance
 */
let globalOutputFormatter: OutputFormatter = new ConsoleOutputFormatter();

/**
 * Configure the global output formatter
 */
export function configureOutputFormatter(options: OutputOptions): void {
  globalOutputFormatter = new ConsoleOutputFormatter(options);
}

/**
 * Get the current output formatter instance
 */
export function getOutputFormatter(): OutputFormatter {
  return globalOutputFormatter;
}

/**
 * Parse output-related CLI options
 */
export function parseOutputOptions(options: Record<string, unknown>): OutputOptions {
  const parent = (options.parent as Record<string, unknown>) || {};

  return {
    verbose: Boolean(options.verbose || parent.verbose),
    quiet: Boolean(options.quiet || parent.quiet),
    json: Boolean(options.json || parent.json),
    noColor: Boolean(options.noColor || parent.noColor || process.env.NO_COLOR),
    level: getLogLevelFromOptions(options, parent),
  };
}

function getLogLevelFromOptions(
  options: Record<string, unknown>,
  parent: Record<string, unknown>
): LogLevel {
  if (options.verbose || parent.verbose) {
    return LogLevel.DEBUG;
  }
  if (options.quiet || parent.quiet) {
    return LogLevel.ERROR;
  }
  return LogLevel.INFO;
}

/**
 * Initialize output system for a command
 */
export function initializeOutput(options: Record<string, unknown>): void {
  const outputOptions = parseOutputOptions(options);
  configureLogger(outputOptions);
  configureOutputFormatter(outputOptions);
}

/**
 * Utility functions for common output patterns
 */
export const output = {
  error: (message: string, ...args: unknown[]) => getLogger().error(message, ...args),
  warn: (message: string, ...args: unknown[]) => getLogger().warn(message, ...args),
  info: (message: string, ...args: unknown[]) => getLogger().info(message, ...args),
  debug: (message: string, ...args: unknown[]) => getLogger().debug(message, ...args),
  success: (message: string, ...args: unknown[]) => getLogger().success(message, ...args),
  table: (data: Record<string, unknown>[], options?: TableOptions) =>
    getOutputFormatter().table(data, options),
  list: (items: string[], options?: ListOptions) => getOutputFormatter().list(items, options),
  json: (data: unknown, options?: JsonOptions) => getOutputFormatter().json(data, options),
  yaml: (data: unknown, options?: YamlOptions) => getOutputFormatter().yaml(data, options),
};
