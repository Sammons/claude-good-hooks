/**
 * Simple console service that wraps console operations
 */
export class ConsoleService {
  log(...args: unknown[]): void {
    console.log(...args);
  }

  error(...args: unknown[]): void {
    console.error(...args);
  }

  warn(...args: unknown[]): void {
    console.warn(...args);
  }

  info(...args: unknown[]): void {
    console.info(...args);
  }

  debug(...args: unknown[]): void {
    console.debug(...args);
  }
}
