/**
 * Refactored PackageService using single-function files
 */

// Import single-function modules
import { getPackageInfo, type PackageInfo } from './package/get-package-info.js';
import { findPackageJson } from './package/find-package-json.js';
import { getPackageVersion } from './package/get-package-version.js';
import { updatePackageJson } from './package/update-package-json.js';

// Re-export types
export type { PackageInfo };

export class PackageService {
  constructor() {}

  getPackageInfo(): PackageInfo | null {
    return getPackageInfo();
  }

  // Additional methods for completeness
  findPackageJson(): string {
    return findPackageJson();
  }

  getPackageVersion(packagePath: string): string | null {
    return getPackageVersion(packagePath);
  }

  updatePackageJson(packagePath: string, updates: Record<string, unknown>): boolean {
    return updatePackageJson(packagePath, updates);
  }
}
