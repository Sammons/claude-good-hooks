/**
 * List available hooks (installed modules that can be used)
 */

import type { HookMetadata } from '../../types/index.js';
import { ModuleService } from '../module.service.js';

/**
 * List available hooks for a given global/local scope
 */
export async function listAvailableHooks(global: boolean): Promise<HookMetadata[]> {
  const hooks: HookMetadata[] = [];
  const moduleService = new ModuleService();

  try {
    const installedModules = await moduleService.getInstalledHookModules(global);
    for (const moduleName of installedModules) {
      const plugin = await moduleService.loadHookPlugin(moduleName, global);
      if (plugin) {
        hooks.push({
          name: plugin.name,
          description: plugin.description,
          version: plugin.version,
          source: global ? 'global' : 'local',
          packageName: moduleName,
          installed: true,
        });
      }
    }
  } catch (error: unknown) {
    console.warn(
      `Warning: Could not list installed hook modules (global: ${global}): ${String(error)}`
    );
  }

  return hooks;
}