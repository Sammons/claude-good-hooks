/**
 * Interface for console output operations
 * Allows for easy mocking and testing of console-based commands
 */
export interface IConsoleService {
  log(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  info(message: string): void;
}

/**
 * Default implementation that uses the actual console
 */
export class ConsoleService implements IConsoleService {
  log(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  info(message: string): void {
    console.info(message);
  }
}