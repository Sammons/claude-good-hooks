import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { parseHookIdentifier } from './parse-hook-identifier.js';
import type { PackageManagerHelper } from '../helpers/package-manager-helper.js';

export async function isModuleInstalled(
  hookIdentifier: string,
  packageManagerHelper: PackageManagerHelper,
  global: boolean = false
): Promise<boolean> {
  try {
    const { moduleName, isFile } = parseHookIdentifier(hookIdentifier);

    // For file paths, just check if the file exists
    if (isFile) {
      // Resolve relative paths to absolute paths for checking
      const resolvedPath = resolve(process.cwd(), moduleName);
      return existsSync(resolvedPath);
    }

    // For npm modules, check in node_modules
    if (global) {
      const globalPath = await packageManagerHelper.getGlobalRoot();
      return existsSync(join(globalPath, moduleName));
    } else {
      const localPath = join(process.cwd(), 'node_modules', moduleName);
      return existsSync(localPath);
    }
  } catch (error) {
    return false;
  }
}