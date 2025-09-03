import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';

/**
 * Simple file system service that wraps Node.js fs operations
 */
export class FileSystemService {
  exists(path: string): boolean {
    return existsSync(path);
  }

  readFile(path: string, encoding: BufferEncoding): string {
    return readFileSync(path, encoding);
  }

  writeFile(path: string, content: string): void {
    writeFileSync(path, content);
  }

  mkdir(path: string, options?: { recursive?: boolean }): void {
    mkdirSync(path, options);
  }

  dirname(path: string): string {
    return dirname(path);
  }

  join(...paths: string[]): string {
    return join(...paths);
  }

  homedir(): string {
    return homedir();
  }

  cwd(): string {
    return process.cwd();
  }
}