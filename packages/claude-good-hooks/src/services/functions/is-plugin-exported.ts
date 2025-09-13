/**
 * Check if a plugin is exported properly from a module
 */

import { loadHookPlugin } from './load-hook-plugin.js';
import type { PackageManagerHelper } from '../../helpers/package-manager-helper.js';

/**
 * Check if a plugin is exported properly from a module
 */
export async function isPluginExported(
  hookName: string,
  packageManagerHelper: PackageManagerHelper,
  global: boolean = false
): Promise<boolean> {
  try {
    const plugin = await loadHookPlugin(hookName, packageManagerHelper, global);
    return plugin !== null;
  } catch (error) {
    console.error(`Error checking plugin export for ${hookName}:`, error);
    return false;
  }
}