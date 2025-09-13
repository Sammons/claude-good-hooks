/**
 * Atomic write file operation for dual settings system
 */

import type { FileSystemProvider } from '../interfaces/file-system-provider.js';

/**
 * Atomic write file operation
 */
export async function atomicWriteFile(
  filePath: string,
  content: string,
  fileSystem: FileSystemProvider
): Promise<void> {
  try {
    await fileSystem.writeFile(filePath, content);
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${(error as Error).message}`);
  }
}
