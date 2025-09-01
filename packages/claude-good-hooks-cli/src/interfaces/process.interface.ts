/**
 * Interface for process operations
 * Allows for easy mocking and testing of process-based operations
 */
export interface IProcessService {
  exit(code: number): void;
  execSync(command: string, options?: { encoding?: BufferEncoding; cwd?: string }): string;
  getVersion(): string;
}

/**
 * Default implementation that uses actual process operations
 */
export class ProcessService implements IProcessService {
  exit(code: number): void {
    process.exit(code);
  }

  execSync(command: string, options: { encoding?: BufferEncoding; cwd?: string } = {}): string {
    const { execSync } = require('child_process');
    return execSync(command, { encoding: 'utf-8', ...options });
  }

  getVersion(): string {
    return process.version;
  }
}