import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { PackageManagerHelper } from '../helpers/package-manager-helper.js';

export async function getModuleVersion(
  moduleName: string,
  packageManagerHelper: PackageManagerHelper,
  global: boolean = false
): Promise<string | null> {
  try {
    let packageJsonPath: string;

    if (global) {
      const globalPath = await packageManagerHelper.getGlobalRoot();
      packageJsonPath = join(globalPath, moduleName, 'package.json');
    } else {
      packageJsonPath = join(
        process.cwd(),
        'node_modules',
        moduleName,
        'package.json'
      );
    }

    if (!existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || null;
  } catch (error) {
    console.error(`Error reading version for module ${moduleName}:`, error);
    return null;
  }
}