/**
 * Get package information from package.json
 */

import { readFileSync } from 'fs';
import { findPackageJson } from './find-package-json.js';

export interface PackageInfo {
  name: string;
  version: string;
}

/**
 * Get package information from package.json
 */
export function getPackageInfo(): PackageInfo | null {
  try {
    const packagePath = findPackageJson();
    const content = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(content);

    return {
      name: packageJson.name,
      version: packageJson.version,
    };
  } catch {
    return null;
  }
}