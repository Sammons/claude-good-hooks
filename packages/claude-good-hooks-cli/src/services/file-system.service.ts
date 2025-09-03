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

  writeFile(path: string, content: string, encoding?: BufferEncoding): void {
    writeFileSync(path, content, encoding ? { encoding } : undefined);
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
