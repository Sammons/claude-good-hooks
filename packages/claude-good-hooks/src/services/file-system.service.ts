import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  statSync,
  rmSync,
  watch,
} from 'fs';
import {
  access,
  readFile as readFileAsync,
  writeFile as writeFileAsync,
  mkdir as mkdirAsync,
} from 'fs/promises';
import { constants } from 'fs';
import { homedir } from 'os';
import { join, dirname, resolve, isAbsolute } from 'path';

/**
 * Simple file system service that wraps Node.js fs operations
 */
export class FileSystemService {
  exists(path: string): boolean {
    return existsSync(path);
  }

  async existsAsync(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  readFile(path: string, encoding: BufferEncoding): string {
    return readFileSync(path, encoding);
  }

  async readFileAsync(path: string, encoding: BufferEncoding): Promise<string> {
    return await readFileAsync(path, encoding);
  }

  writeFile(path: string, content: string, encoding?: BufferEncoding): void {
    writeFileSync(path, content, encoding ? { encoding } : undefined);
  }

  async writeFileAsync(path: string, content: string, encoding?: BufferEncoding): Promise<void> {
    await writeFileAsync(path, content, encoding ? { encoding } : undefined);
  }

  mkdir(path: string, options?: { recursive?: boolean }): void {
    mkdirSync(path, options);
  }

  async mkdirAsync(path: string, options?: { recursive?: boolean }): Promise<void> {
    await mkdirAsync(path, options);
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

  /**
   * Resolve a path relative to the current working directory
   * If the path is already absolute, returns it as-is
   * @param relativePath The path to resolve
   * @returns Absolute path
   */
  resolveFromCwd(relativePath: string): string {
    return resolve(process.cwd(), relativePath);
  }

  /**
   * Check if a path is absolute
   * @param path The path to check
   * @returns True if the path is absolute
   */
  isAbsolute(path: string): boolean {
    return isAbsolute(path);
  }

  unlink(path: string): void {
    unlinkSync(path);
  }

  stat(path: string) {
    return statSync(path);
  }

  rmdir(path: string, options?: { recursive?: boolean }): void {
    if (options?.recursive) {
      rmSync(path, { recursive: true });
    } else {
      rmSync(path);
    }
  }

  watch(
    path: string,
    options?: { recursive?: boolean; persistent?: boolean },
    listener?: (eventType: string, filename: string | Buffer | null) => void
  ) {
    return watch(path, options, listener);
  }
}
