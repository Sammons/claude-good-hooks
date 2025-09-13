/**
 * Atomic read file operation for dual settings system
 */

import type { FileSystemProvider } from '../interfaces/file-system-provider.js';

export interface AtomicReadResult {
  success: boolean;
  content?: string;
  error?: Error;
}

/**
 * Atomic read file operation
 */
export async function atomicReadFile(
  filePath: string,
  fileSystem: FileSystemProvider
): Promise<AtomicReadResult> {
  try {
    if (!(await fileSystem.exists(filePath))) {
      return { success: true, content: '{}' };
    }

    const content = await fileSystem.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
