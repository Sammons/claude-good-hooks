/**
 * Get help information for a specific hook
 */

import { ModuleService } from '../module.service.js';

export interface HookHelpInfo {
  name: string;
  description: string;
  version: string;
  customArgs?: Record<string, unknown>;
  usage: string;
}

/**
 * Get help information for a specific hook
 */
export async function getHookHelp(hookName: string, global: boolean): Promise<HookHelpInfo | null> {
  const moduleService = new ModuleService();
  const plugin = await moduleService.loadHookPlugin(hookName, global);

  if (!plugin) {
    return null;
  }

  return {
    name: plugin.name,
    description: plugin.description,
    version: plugin.version,
    customArgs: plugin.customArgs || {},
    usage: `claude-good-hooks apply ${hookName} [options]`,
  };
}