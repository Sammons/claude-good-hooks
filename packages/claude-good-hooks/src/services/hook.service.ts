/**
 * Refactored HookService using single-function files
 */

// Import single-function modules
import { applyHook, type ApplyHookResult } from './hooks/apply-hook.js';
import { getHookHelp, type HookHelpInfo } from './hooks/get-hook-help.js';
import { parseHookArgs, type ParsedHookArgs } from './hooks/parse-hook-args.js';
import { listInstalledHooks } from './hooks/list-installed-hooks.js';
import { listAvailableHooks } from './hooks/list-available-hooks.js';
import { regenerateHooks, type RegenerateAllHooksResult } from './hooks/regenerate-hooks.js';
import { parseHookArgsFromSaved } from './hooks/parse-hook-args-from-saved.js';

// Re-export types
export type { ApplyHookResult, HookHelpInfo, RegenerateAllHooksResult };

import type { HookMetadata, HookPlugin } from '../types/index.js';
import type { SettingsScope } from './dual-settings.service.js';

export class HookService {
  constructor() {}

  async applyHook(
    hookName: string,
    args: string[],
    scope: SettingsScope
  ): Promise<ApplyHookResult> {
    return applyHook(hookName, args, scope);
  }

  async getHookHelp(hookName: string, global: boolean): Promise<HookHelpInfo | null> {
    return getHookHelp(hookName, global);
  }

  parseHookArgs(args: string[], plugin: HookPlugin): ParsedHookArgs {
    return parseHookArgs(args, plugin);
  }

  async listInstalledHooks(scope: SettingsScope): Promise<HookMetadata[]> {
    return listInstalledHooks(scope);
  }

  async listAvailableHooks(global: boolean): Promise<HookMetadata[]> {
    return listAvailableHooks(global);
  }

  async regenerateHooks(
    hookName?: string,
    scope?: SettingsScope
  ): Promise<RegenerateAllHooksResult> {
    return regenerateHooks(hookName, scope);
  }

  // Keep these private methods for backwards compatibility if needed
  parseHookArgsFromSaved(savedArgs: Record<string, unknown>, plugin: HookPlugin): ParsedHookArgs {
    return parseHookArgsFromSaved(savedArgs, plugin);
  }

}