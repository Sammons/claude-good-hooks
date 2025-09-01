/**
 * Shared logging utility for claude-good-hooks monorepo
 * Provides consistent logging across all packages
 */

import chalk from 'chalk';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  enableColors?: boolean;
  enableTimestamps?: boolean;
  enableMetadata?: boolean;
  outputFormat?: 'text' | 'json';
  silent?: boolean;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  prefix?: string;
  metadata?: Record<string, unknown>;
  args?: unknown[];
}

export interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  log(level: LogLevel, message: string, ...args: unknown[]): void;
  
  // Structured logging
  withPrefix(prefix: string): Logger;
  withMetadata(metadata: Record<string, unknown>): Logger;
  child(options: Partial<LoggerOptions>): Logger;
  
  // Utility methods
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  isLevelEnabled(level: LogLevel): boolean;
}

/**
 * Standard logger implementation with consistent formatting
 */
export class StandardLogger implements Logger {
  private options: Required<LoggerOptions>;
  private metadata: Record<string, unknown> = {};

  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: options.level ?? LogLevel.INFO,
      prefix: options.prefix ?? '',
      enableColors: options.enableColors ?? !process.env.NO_COLOR && process.stdout.isTTY,
      enableTimestamps: options.enableTimestamps ?? false,
      enableMetadata: options.enableMetadata ?? false,
      outputFormat: options.outputFormat ?? 'text',
      silent: options.silent ?? false
    };

    // Disable chalk if colors are disabled
    if (!this.options.enableColors) {
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
    if (this.isLevelEnabled(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, args);
      const formatted = this.formatLogEntry(entry, 'success');
      this.output(formatted, LogLevel.INFO);
    }
  }

  log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.isLevelEnabled(level) || this.options.silent) {
      return;
    }

    const entry = this.createLogEntry(level, message, args);
    const formatted = this.formatLogEntry(entry);
    this.output(formatted, level);
  }

  withPrefix(prefix: string): Logger {
    return this.child({ prefix });
  }

  withMetadata(metadata: Record<string, unknown>): Logger {
    const logger = this.child({});
    logger.metadata = { ...this.metadata, ...metadata };
    return logger;
  }

  child(options: Partial<LoggerOptions>): Logger {
    const childOptions: LoggerOptions = {
      ...this.options,
      ...options
    };
    const child = new StandardLogger(childOptions);
    child.metadata = { ...this.metadata };
    return child;
  }

  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  getLevel(): LogLevel {
    return this.options.level;
  }

  isLevelEnabled(level: LogLevel): boolean {
    return level <= this.options.level;
  }

  private createLogEntry(level: LogLevel, message: string, args: unknown[]): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      prefix: this.options.prefix || undefined,
      metadata: Object.keys(this.metadata).length > 0 ? this.metadata : undefined,
      args: args.length > 0 ? args : undefined
    };
  }

  private formatLogEntry(entry: LogEntry, levelOverride?: string): string {
    if (this.options.outputFormat === 'json') {
      return JSON.stringify(entry);
    }

    return this.formatTextLogEntry(entry, levelOverride);
  }

  private formatTextLogEntry(entry: LogEntry, levelOverride?: string): string {
    const parts: string[] = [];

    // Timestamp
    if (this.options.enableTimestamps) {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      parts.push(chalk.gray(`[${timestamp}]`));
    }

    // Level indicator
    const levelName = levelOverride || this.getLevelName(entry.level);
    const coloredLevel = this.colorizeLevel(levelName);
    parts.push(`[${coloredLevel}]`);

    // Prefix
    if (entry.prefix) {
      parts.push(chalk.cyan(`[${entry.prefix}]`));
    }

    // Message
    parts.push(entry.message);

    // Arguments
    if (entry.args && entry.args.length > 0) {
      const formattedArgs = entry.args
        .map(arg => this.formatArgument(arg))
        .join(' ');
      parts.push(formattedArgs);
    }

    // Metadata
    if (this.options.enableMetadata && entry.metadata) {
      const metadataStr = Object.entries(entry.metadata)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      parts.push(chalk.gray(`{${metadataStr}}`));
    }

    return parts.join(' ');
  }

  private formatArgument(arg: unknown): string {
    if (typeof arg === 'string') {
      return arg;
    }
    if (typeof arg === 'object' && arg !== null) {
      return JSON.stringify(arg, null, 2);
    }
    return String(arg);
  }

  private getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return 'ERROR';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.TRACE: return 'TRACE';
      default: return 'INFO';
    }
  }

  private colorizeLevel(levelName: string): string {
    switch (levelName) {
      case 'ERROR': return chalk.red('ERROR');
      case 'WARN': return chalk.yellow('WARN');
      case 'INFO': return chalk.blue('INFO');
      case 'DEBUG': return chalk.gray('DEBUG');
      case 'TRACE': return chalk.gray('TRACE');
      case 'success': return chalk.green('SUCCESS');
      default: return levelName;
    }
  }

  private output(message: string, level: LogLevel): void {
    if (level === LogLevel.ERROR) {
      console.error(message);
    } else {
      console.log(message);
    }
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger = new StandardLogger();

/**
 * Configure the global logger
 */
export function configureLogger(options: LoggerOptions): void {
  globalLogger = new StandardLogger(options);
}

/**
 * Get the global logger instance
 */
export function getLogger(): Logger {
  return globalLogger;
}

/**
 * Create a logger with the specified prefix
 */
export function createLogger(prefix: string, options: LoggerOptions = {}): Logger {
  return new StandardLogger({
    ...options,
    prefix
  });
}

/**
 * Log level utilities
 */
export const LogLevels = {
  fromString(level: string): LogLevel {
    const normalizedLevel = level.toUpperCase();
    switch (normalizedLevel) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': case 'WARNING': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'TRACE': return LogLevel.TRACE;
      default: return LogLevel.INFO;
    }
  },

  toString(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return 'ERROR';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.TRACE: return 'TRACE';
      default: return 'INFO';
    }
  },

  fromEnvironment(): LogLevel {
    const envLevel = process.env.LOG_LEVEL || process.env.DEBUG ? 'DEBUG' : 'INFO';
    return LogLevels.fromString(envLevel);
  }
};

/**
 * Performance logging utilities
 */
export class PerformanceLogger {
  private logger: Logger;
  private timers = new Map<string, number>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  startTimer(label: string): void {
    this.timers.set(label, Date.now());
    this.logger.debug(`Timer started: ${label}`);
  }

  endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      this.logger.warn(`Timer '${label}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);
    this.logger.debug(`Timer ended: ${label} (${duration}ms)`);
    return duration;
  }

  time<T>(label: string, fn: () => T): T;
  time<T>(label: string, fn: () => Promise<T>): Promise<T>;
  time<T>(label: string, fn: () => T | Promise<T>): T | Promise<T> {
    this.startTimer(label);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.endTimer(label);
        });
      } else {
        this.endTimer(label);
        return result;
      }
    } catch (error) {
      this.endTimer(label);
      throw error;
    }
  }
}

/**
 * Create a performance logger
 */
export function createPerformanceLogger(logger?: Logger): PerformanceLogger {
  return new PerformanceLogger(logger || getLogger());
}

/**
 * Structured logging context utilities
 */
export class LoggingContext {
  private static contextStack: Record<string, unknown>[] = [];

  static push(context: Record<string, unknown>): void {
    this.contextStack.push(context);
  }

  static pop(): Record<string, unknown> | undefined {
    return this.contextStack.pop();
  }

  static current(): Record<string, unknown> {
    return this.contextStack.length > 0 
      ? { ...this.contextStack[this.contextStack.length - 1] }
      : {};
  }

  static withContext<T>(context: Record<string, unknown>, fn: () => T): T;
  static withContext<T>(context: Record<string, unknown>, fn: () => Promise<T>): Promise<T>;
  static withContext<T>(context: Record<string, unknown>, fn: () => T | Promise<T>): T | Promise<T> {
    this.push(context);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.pop();
        });
      } else {
        this.pop();
        return result;
      }
    } catch (error) {
      this.pop();
      throw error;
    }
  }
}

/**
 * Commonly used logger instances for different components
 */
export const loggers = {
  cli: createLogger('CLI'),
  hook: createLogger('HOOK'),
  config: createLogger('CONFIG'),
  network: createLogger('NET'),
  filesystem: createLogger('FS')
};