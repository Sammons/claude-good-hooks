/**
 * Interface for file system operations
 * Allows for easy mocking and testing of file-based operations
 */
export interface IFileSystemService {
  exists(path: string): boolean;
  readFile(path: string, encoding?: BufferEncoding): string;
  writeFile(path: string, data: string): void;
  mkdir(path: string, options?: { recursive?: boolean }): void;
  dirname(path: string): string;
  join(...paths: string[]): string;
  homedir(): string;
  cwd(): string;
}

/**
 * Default implementation that uses the actual file system
 */
export class FileSystemService implements IFileSystemService {
  exists(path: string): boolean {
    const { existsSync } = require('fs');
    return existsSync(path);
  }

  readFile(path: string, encoding: BufferEncoding = 'utf-8'): string {
    const { readFileSync } = require('fs');
    return readFileSync(path, encoding);
  }

  writeFile(path: string, data: string): void {
    const { writeFileSync } = require('fs');
    writeFileSync(path, data);
  }

  mkdir(path: string, options: { recursive?: boolean } = {}): void {
    const { mkdirSync } = require('fs');
    mkdirSync(path, options);
  }

  dirname(path: string): string {
    const { dirname } = require('path');
    return dirname(path);
  }

  join(...paths: string[]): string {
    const { join } = require('path');
    return join(...paths);
  }

  homedir(): string {
    const { homedir } = require('os');
    return homedir();
  }

  cwd(): string {
    return process.cwd();
  }
}