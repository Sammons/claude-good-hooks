/**
 * Apply a hook to settings with specified arguments and scope
 */

import type { ClaudeSettings } from '../../types/index.js';
import { ModuleService } from '../module.service.js';
import { DualSettingsService, type SettingsScope } from '../dual-settings.service.js';
import { typedEntries } from '../../utils/keys.js';
import { parseHookArgs } from './parse-hook-args.js';
import { getSettingsDirectoryPath } from './get-settings-directory-path.js';

export interface ApplyHookResult {
  success: boolean;
  hook?: string;
  scope?: SettingsScope;
  args?: Record<string, string | number | boolean>;
  error?: string;
}

/**
 * Apply a hook to settings
 */
export async function applyHook(
  hookName: string,
  args: string[],
  scope: SettingsScope
): Promise<ApplyHookResult> {
  const moduleService = new ModuleService();
  const settingsService = new DualSettingsService();

  const plugin = await moduleService.loadHookPlugin(hookName, scope === 'global');

  if (!plugin) {
    return {
      success: false,
      error: `Hook '${hookName}' not found. Make sure it's installed.`,
    };
  }

  const parsedArgs = parseHookArgs(args, plugin);
  const settingsDirectoryPath = getSettingsDirectoryPath(scope, settingsService);
  const hookConfiguration = plugin.makeHook(parsedArgs, { settingsDirectoryPath });

  if (!hookConfiguration) {
    return {
      success: false,
      error: 'makeHook returned undefined or null',
    };
  }

  for (const [eventName, configs] of typedEntries(hookConfiguration)) {
    if (configs && Array.isArray(configs) && configs.length > 0) {
      for (const config of configs) {
        // Add metadata to the claudegoodhooks property
        const enhancedConfig = {
          ...config,
          claudegoodhooks: {
            name: `${hookName}/${plugin.name}`,
            description: plugin.description,
            version: plugin.version,
            hookFactoryArguments: parsedArgs,
          },
        };

        // eventName is guaranteed to be a key of the hook configuration object
        // which matches the structure of ClaudeSettings['hooks']
        await settingsService.addHookToSettings(
          scope,
          eventName as keyof ClaudeSettings['hooks'],
          enhancedConfig
        );
      }
    }
  }

  return {
    success: true,
    hook: hookName,
    scope,
    args: parsedArgs,
  };
}
