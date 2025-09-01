import chalk from 'chalk';

/**
 * Progress indicator utilities for CLI operations
 */

export interface ProgressOptions {
  message?: string;
  total?: number;
  showPercent?: boolean;
  showETA?: boolean;
  spinner?: boolean;
  width?: number;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'cyan' | 'magenta';
}

export interface SpinnerOptions {
  message?: string;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'cyan' | 'magenta';
  frames?: string[];
}

/**
 * Spinner for async operations
 */
export class Spinner {
  private frames: string[];
  private message: string;
  private color: string;
  private interval?: NodeJS.Timeout;
  private currentFrame = 0;
  private isSpinning = false;

  constructor(options: SpinnerOptions = {}) {
    this.frames = options.frames || ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.message = options.message || '';
    this.color = options.color || 'cyan';
  }

  start(message?: string): this {
    if (this.isSpinning) {
      this.stop();
    }

    if (message) {
      this.message = message;
    }

    this.isSpinning = true;
    this.currentFrame = 0;

    // Hide cursor
    process.stdout.write('\x1B[?25l');

    this.interval = setInterval(() => {
      if (!this.isSpinning) return;
      
      const frame = this.frames[this.currentFrame];
      const coloredFrame = chalk[this.color as keyof typeof chalk](frame) as string;
      
      process.stdout.write(`\r${coloredFrame} ${this.message}`);
      
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);

    return this;
  }

  stop(finalMessage?: string, symbol?: string): this {
    if (!this.isSpinning) return this;

    this.isSpinning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    // Clear the line
    process.stdout.write('\r\x1B[K');
    
    if (finalMessage !== undefined) {
      const finalSymbol = symbol || '✓';
      const coloredSymbol = chalk.green(finalSymbol);
      process.stdout.write(`${coloredSymbol} ${finalMessage}\n`);
    }

    // Show cursor
    process.stdout.write('\x1B[?25h');

    return this;
  }

  fail(message?: string): this {
    const failMessage = message || this.message;
    this.stop(failMessage, '✗');
    return this;
  }

  succeed(message?: string): this {
    const successMessage = message || this.message;
    this.stop(successMessage, '✓');
    return this;
  }

  warn(message?: string): this {
    const warnMessage = message || this.message;
    this.stop(warnMessage, '⚠');
    return this;
  }

  info(message?: string): this {
    const infoMessage = message || this.message;
    this.stop(infoMessage, 'ℹ');
    return this;
  }

  updateMessage(message: string): this {
    this.message = message;
    return this;
  }
}

/**
 * Progress bar for multi-step operations
 */
export class ProgressBar {
  private current = 0;
  private total: number;
  private width: number;
  private message: string;
  private startTime: number;
  private showPercent: boolean;
  private showETA: boolean;
  private color: string;

  constructor(total: number, options: ProgressOptions = {}) {
    this.total = total;
    this.width = options.width || 30;
    this.message = options.message || '';
    this.showPercent = options.showPercent !== false;
    this.showETA = options.showETA !== false;
    this.color = options.color || 'green';
    this.startTime = Date.now();
  }

  update(current: number, message?: string): this {
    this.current = Math.min(current, this.total);
    if (message) {
      this.message = message;
    }
    this.render();
    return this;
  }

  increment(amount = 1, message?: string): this {
    return this.update(this.current + amount, message);
  }

  complete(message?: string): this {
    this.current = this.total;
    if (message) {
      this.message = message;
    }
    this.render();
    process.stdout.write('\n');
    return this;
  }

  private render(): void {
    const percent = Math.floor((this.current / this.total) * 100);
    const filled = Math.floor((this.current / this.total) * this.width);
    const empty = this.width - filled;

    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    const bar = chalk[this.color as keyof typeof chalk](filledBar) + chalk.gray(emptyBar);

    let output = `\r[${bar}]`;
    
    if (this.showPercent) {
      output += ` ${percent}%`;
    }

    if (this.message) {
      output += ` ${this.message}`;
    }

    if (this.showETA && this.current > 0) {
      const elapsed = Date.now() - this.startTime;
      const rate = this.current / elapsed;
      const remaining = this.total - this.current;
      const eta = remaining / rate;
      
      if (isFinite(eta) && eta > 0) {
        const etaSeconds = Math.ceil(eta / 1000);
        output += ` ETA: ${this.formatTime(etaSeconds)}`;
      }
    }

    output += ` (${this.current}/${this.total})`;
    
    process.stdout.write(output);
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}

/**
 * Create a new spinner instance
 */
export function createSpinner(options?: SpinnerOptions): Spinner {
  return new Spinner(options);
}

/**
 * Create a new progress bar instance
 */
export function createProgressBar(total: number, options?: ProgressOptions): ProgressBar {
  return new ProgressBar(total, options);
}

/**
 * Simple progress indicator for async operations
 */
export async function withSpinner<T>(
  operation: () => Promise<T>,
  message: string,
  options: SpinnerOptions = {}
): Promise<T> {
  const spinner = new Spinner({ ...options, message });
  
  try {
    spinner.start();
    const result = await operation();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

/**
 * Progress indicator for operations with known total steps
 */
export async function withProgressBar<T>(
  operation: (progress: ProgressBar) => Promise<T>,
  total: number,
  message: string,
  options: ProgressOptions = {}
): Promise<T> {
  const progress = new ProgressBar(total, { ...options, message });
  
  try {
    const result = await operation(progress);
    progress.complete();
    return result;
  } catch (error) {
    process.stdout.write('\n');
    throw error;
  }
}

/**
 * Utility to make operations cancelable
 */
export interface CancelableOperation<T> {
  promise: Promise<T>;
  cancel: () => void;
  isCanceled: () => boolean;
}

export function makeCancelable<T>(
  operation: (signal: AbortSignal) => Promise<T>
): CancelableOperation<T> {
  const abortController = new AbortController();
  
  const promise = operation(abortController.signal);
  
  return {
    promise,
    cancel: () => abortController.abort(),
    isCanceled: () => abortController.signal.aborted
  };
}

/**
 * Run operation with spinner and cancellation support
 */
export async function withCancelableSpinner<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  message: string,
  options: SpinnerOptions = {}
): Promise<T> {
  const spinner = new Spinner({ ...options, message });
  const cancelable = makeCancelable(operation);
  
  // Setup Ctrl+C handler
  const sigintHandler = () => {
    spinner.stop(chalk.yellow('Operation canceled'));
    cancelable.cancel();
  };
  
  process.on('SIGINT', sigintHandler);
  
  try {
    spinner.start();
    const result = await cancelable.promise;
    spinner.succeed();
    return result;
  } catch (error) {
    if (cancelable.isCanceled()) {
      spinner.stop(chalk.yellow('Operation canceled'));
      process.exit(130); // Standard exit code for SIGINT
    } else {
      spinner.fail();
      throw error;
    }
  } finally {
    process.removeListener('SIGINT', sigintHandler);
  }
}