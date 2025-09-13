/**
 * Create a file system provider for settings operations
 */

import { readFile, writeFile, access, mkdir, constants } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { cwd } from 'process';

/**
 * Create a file system provider that implements the duck-typed interface
 * expected by the core SettingsHelper from the settings package
 */
export function createFileSystemProvider() {
  return {
    async readFile(path: string, encoding?: string): Promise<string> {
      const buffer = await readFile(path, (encoding as BufferEncoding) || 'utf-8');
      return buffer.toString();
    },

    async writeFile(path: string, content: string, encoding?: string): Promise<void> {
      await writeFile(path, content, encoding as any);
    },

    async exists(path: string): Promise<boolean> {
      try {
        await access(path, constants.F_OK);
        return true;
      } catch {
        return false;
      }
    },

    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
      await mkdir(path, options);
    },

    dirname(path: string): string {
      return dirname(path);
    },

    join(...paths: string[]): string {
      return join(...paths);
    },

    homedir(): string {
      return homedir();
    },

    cwd(): string {
      return cwd();
    }
  };
}