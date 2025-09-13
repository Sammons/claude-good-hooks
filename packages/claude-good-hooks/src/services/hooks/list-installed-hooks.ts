/**
 * List installed hooks for a given scope
 */

import type { HookMetadata } from '../../types/index.js';
import { ModuleService } from '../module.service.js';
import { DualSettingsService, type SettingsScope } from '../dual-settings.service.js';

/**
 * List installed hooks for a given scope
 */
export async function listInstalledHooks(scope: SettingsScope): Promise<HookMetadata[]> {
  const hooks: HookMetadata[] = [];
  const moduleService = new ModuleService();
  const settingsService = new DualSettingsService();
  const isGlobal = scope === 'global';

  try {
    const installedModules = await moduleService.getInstalledHookModules(isGlobal);

    for (const moduleName of installedModules) {
      const plugin = await moduleService.loadHookPlugin(moduleName, isGlobal);
      if (plugin) {
        hooks.push({
          name: plugin.name,
          description: plugin.description,
          version: plugin.version,
          source: isGlobal ? 'global' : 'local',
          packageName: moduleName,
          installed: true,
        });
      }
    }
  } catch (error: unknown) {
    // Log the error but continue to show configured hooks from settings
    console.warn(`Warning: Could not list installed hook modules: ${String(error)}`);
  }

  const hooksWithMetadata = await settingsService.getHooksWithMetadata(scope);
  for (const [eventName, hookArray] of Object.entries(hooksWithMetadata)) {
    for (const hookWithMeta of hookArray) {
      const metadata = hookWithMeta.metadata;
      const config = hookWithMeta.configuration;

      // Use metadata if available, otherwise fall back to config properties for backwards compatibility
      const name =
        metadata?.identifier.name ||
        (config as any).claudegoodhooks?.name ||
        (config as any).name ||
        `${eventName}${config.matcher ? `:${config.matcher}` : ''}`;
      const description =
        metadata?.description ||
        (config as any).claudegoodhooks?.description ||
        (config as any).description ||
        `Configured ${eventName} hook`;
      const version =
        metadata?.identifier.version ||
        (config as any).claudegoodhooks?.version ||
        (config as any).version ||
        'n/a';

      hooks.push({
        name,
        description,
        version,
        source: isGlobal ? 'global' : 'local',
        installed: true,
        hookConfiguration: config,
      });
    }
  }

  return hooks;
}