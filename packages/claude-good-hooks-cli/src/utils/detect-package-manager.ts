import { existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Package manager type
 */
export type PackageManager = 'pnpm' | 'npm' | 'yarn';

/**
 * Detect the package manager being used in the current project
 * 
 * Checks the current directory and up to 3 parent directories for:
 * - pnpm-lock.yaml or pnpm-workspace.yaml (indicates pnpm)
 * - yarn.lock (indicates yarn) 
 * - defaults to npm if no specific lock files are found
 * 
 * @returns The detected package manager
 */
export function detectPackageManager(): PackageManager {
  let currentDir = process.cwd();
  
  // Check current directory and up to 3 parent directories for package manager files
  for (let i = 0; i < 4; i++) {
    if (existsSync(join(currentDir, 'pnpm-lock.yaml')) ||
        existsSync(join(currentDir, 'pnpm-workspace.yaml'))) {
      return 'pnpm';
    }
    
    if (existsSync(join(currentDir, 'yarn.lock'))) {
      return 'yarn';
    }
    
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break; // reached root
    currentDir = parentDir;
  }
  
  return 'npm';
}