/**
 * Update package.json with new information
 */

import { readFileSync, writeFileSync } from 'fs';

/**
 * Update package.json with new information
 */
export function updatePackageJson(packagePath: string, updates: Record<string, unknown>): boolean {
  try {
    const content = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(content);

    // Apply updates
    Object.assign(packageJson, updates);

    // Write back to file with proper formatting
    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    return true;
  } catch {
    return false;
  }
}
