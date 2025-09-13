import { mkdirSync, mkdir } from 'fs';
import { promisify } from 'util';

const mkdirAsync = promisify(mkdir);

export function createDirectory(path: string, options?: { recursive?: boolean }): void {
  mkdirSync(path, options);
}

export async function createDirectoryAsync(path: string, options?: { recursive?: boolean }): Promise<void> {
  await mkdirAsync(path, options);
}