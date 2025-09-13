/**
 * Unified FileSystemProvider interface for all settings operations
 */

export interface FileSystemProvider {
  readFile(path: string, encoding?: string): Promise<string>;
  writeFile(path: string, content: string, encoding?: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  dirname(path: string): string;
  join(...paths: string[]): string;
  homedir(): string;
  cwd(): string;
}
