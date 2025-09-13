/**
 * Regenerate a single hook with saved arguments
 */

import type { ClaudeSettings } from '../../types/index.js';
import { ModuleService } from '../module.service.js';
import { DualSettingsService, type SettingsScope } from '../dual-settings.service.js';
import { parseHookArgsFromSaved } from './parse-hook-args-from-saved.js';
import { getSettingsDirectoryPath } from './get-settings-directory-path.js';

export interface RegenerateHookResult {
  success: boolean;
  hookName: string;
  scope: SettingsScope;
  eventName: string;
  error?: string;
  updated?: boolean;
}

/**
 * Regenerate a single hook with saved arguments
 */
export async function regenerateSingleHook(
  hookName: string,
  savedArgs: Record<string, unknown>,
  scope: SettingsScope,
  eventName: keyof Required<ClaudeSettings>['hooks']
): Promise<RegenerateHookResult> {
  const moduleService = new ModuleService();
  const settingsService = new DualSettingsService();

  try {
    // Extract module name from the hook name
    const moduleName = moduleService.extractModuleNameFromHookName(hookName);
    const isGlobal = scope === 'global';

    // Check if the module is still installed
    if (!(await moduleService.isModuleInstalled(moduleName, isGlobal))) {
      // Check if it's a file path to provide a more helpful error message
      const isFile =
        moduleName.endsWith('.js') ||
        moduleName.endsWith('.mjs') ||
        moduleName.endsWith('.cjs') ||
        moduleName.startsWith('./') ||
        moduleName.startsWith('../') ||
        moduleName.startsWith('/');

      const errorMessage = isFile
        ? `File ${moduleName} not found - it may have been moved or deleted`
        : `Module ${moduleName} is not installed ${isGlobal ? 'globally' : 'locally'}`;

      return {
        success: false,
        hookName,
        scope,
        eventName,
        error: errorMessage,
      };
    }

    // Load the plugin
    const plugin = await moduleService.loadHookPlugin(moduleName, isGlobal);
    if (!plugin) {
      return {
        success: false,
        hookName,
        scope,
        eventName,
        error: `Failed to load plugin from module ${moduleName}`,
      };
    }

    // Parse the saved arguments using the current plugin definition
    const parsedArgs = parseHookArgsFromSaved(savedArgs, plugin);
    const settingsDirectoryPath = getSettingsDirectoryPath(scope, settingsService);

    // Generate the new hook configuration
    const hookConfiguration = plugin.makeHook(parsedArgs, { settingsDirectoryPath });

    // Check if this event type exists in the new configuration
    const newConfigs = hookConfiguration[eventName];
    if (!newConfigs || !Array.isArray(newConfigs) || newConfigs.length === 0) {
      return {
        success: false,
        hookName,
        scope,
        eventName,
        error: `Hook ${hookName} no longer provides configuration for event ${eventName}`,
      };
    }

    // Add the updated hook configurations
    for (const newConfig of newConfigs) {
      const enhancedConfig = {
        ...newConfig,
        claudegoodhooks: {
          name: hookName,
          description: plugin.description,
          version: plugin.version,
          hookFactoryArguments: parsedArgs,
        },
      };

      await settingsService.addHookToSettings(scope, eventName, enhancedConfig);
    }

    return {
      success: true,
      hookName,
      scope,
      eventName,
      updated: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      hookName,
      scope,
      eventName,
      error: `Unexpected error: ${String(error)}`,
    };
  }
}
