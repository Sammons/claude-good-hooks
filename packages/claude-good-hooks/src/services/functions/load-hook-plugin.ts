import { join, resolve } from 'path';
import type { HookPlugin } from '../../types/index.js';
import { parseHookIdentifier } from './parse-hook-identifier.js';
import type { PackageManagerHelper } from '../helpers/package-manager-helper.js';

export async function loadHookPlugin(
  hookIdentifier: string,
  packageManagerHelper: PackageManagerHelper,
  global: boolean = false
): Promise<HookPlugin | null> {
  try {
    const { moduleName, exportPath, isFile } = parseHookIdentifier(hookIdentifier);

    let modulePath: string;
    if (isFile) {
      // For file paths, resolve to absolute path
      modulePath = resolve(process.cwd(), moduleName);
    } else {
      // For npm modules, locate in node_modules
      if (global) {
        const globalPath = await packageManagerHelper.getGlobalRoot();
        modulePath = join(globalPath, moduleName);
      } else {
        modulePath = join(process.cwd(), 'node_modules', moduleName);
      }
    }

    const module = await import(modulePath);

    // Handle export path (e.g., @sammons/my-package/myExport)
    if (exportPath) {
      // Try direct export
      if (module[exportPath]) {
        return module[exportPath] as HookPlugin;
      }
      // Try with HookPlugin suffix
      if (module[exportPath + 'HookPlugin']) {
        return module[exportPath + 'HookPlugin'] as HookPlugin;
      }
      console.error(`Export '${exportPath}' not found in module ${moduleName}`);
      return null;
    }

    // Default export handling
    let plugin: HookPlugin | undefined;

    // First try the HookPlugin export
    plugin = module.HookPlugin || module.default?.HookPlugin;

    // If no HookPlugin export, try the default export (if it looks like a plugin)
    if (!plugin && module.default && typeof module.default === 'object' && 'default' in module.default && !module.default.makeHook) {
      // This handles cases where the module has a nested default export
      plugin = module.default.default as HookPlugin;
    } else if (!plugin) {
      plugin = module.default as HookPlugin;
    }

    return plugin || null;
  } catch (error) {
    console.error(`Failed to load hook plugin from ${hookIdentifier}:`, String(error));
    return null;
  }
}