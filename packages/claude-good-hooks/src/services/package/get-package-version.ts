/**
 * Get package version from package.json
 */

import { readFileSync } from 'fs';

/**
 * Get package version from package.json
 */
export function getPackageVersion(packagePath: string): string | null {
  try {
    const content = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(content);
    return packageJson.version || null;
  } catch {
    return null;
  }
}
