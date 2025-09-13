/**
 * Refactored ModuleService using single-function files (already mostly done)
 */

import type { HookPlugin } from '../types/index.js';
import { detectPackageManager } from '../utils/detect-package-manager.js';
import { PackageManagerHelper } from '../helpers/package-manager-helper.js';

// Import the functions
import { isModuleInstalled } from './functions/is-module-installed.js';
import { loadHookPlugin } from './functions/load-hook-plugin.js';
import { getInstalledHookModules } from './functions/get-installed-hook-modules.js';
import { getModuleVersion } from './functions/get-module-version.js';
import { extractModuleNameFromHookName } from './functions/extract-module-name-from-hook-name.js';
import { isPluginExported } from './functions/is-plugin-exported.js';
import { isFilePath } from './functions/is-file-path.js';
import { parseHookIdentifier } from './functions/parse-hook-identifier.js';

export class ModuleService {
  private packageManagerHelper: PackageManagerHelper;

  constructor() {
    const packageManager = detectPackageManager();
    this.packageManagerHelper = new PackageManagerHelper(packageManager);
  }

  async isModuleInstalled(hookIdentifier: string, global: boolean = false): Promise<boolean> {
    return isModuleInstalled(hookIdentifier, this.packageManagerHelper, global);
  }

  async loadHookPlugin(
    hookIdentifier: string,
    global: boolean = false
  ): Promise<HookPlugin | null> {
    return loadHookPlugin(hookIdentifier, this.packageManagerHelper, global);
  }

  async getInstalledHookModules(global: boolean = false): Promise<string[]> {
    return getInstalledHookModules(this.packageManagerHelper, global);
  }

  async getModuleVersion(moduleName: string, global: boolean = false): Promise<string | null> {
    return getModuleVersion(moduleName, this.packageManagerHelper, global);
  }

  extractModuleNameFromHookName(hookName: string): string {
    return extractModuleNameFromHookName(hookName);
  }

  async isPluginExported(hookName: string, global: boolean = false): Promise<boolean> {
    return isPluginExported(hookName, this.packageManagerHelper, global);
  }

  // Methods exposed for testing
  isFilePath(identifier: string): boolean {
    return isFilePath(identifier);
  }

  parseHookIdentifier(hookIdentifier: string): {
    moduleName: string;
    exportPath?: string;
    isFile?: boolean;
  } {
    return parseHookIdentifier(hookIdentifier);
  }
}
