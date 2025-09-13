/**
 * Regenerate hooks (single or all) with their saved arguments
 */

import type { ClaudeSettings } from '../../types/index.js';
import { DualSettingsService, type SettingsScope } from '../dual-settings.service.js';
import { regenerateSingleHook, type RegenerateHookResult } from './regenerate-single-hook.js';

export interface RegenerateAllHooksResult {
  results: RegenerateHookResult[];
  totalProcessed: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
}

/**
 * Regenerate hooks with their saved arguments
 */
export async function regenerateHooks(
  hookName?: string,
  scope?: SettingsScope
): Promise<RegenerateAllHooksResult> {
  const settingsService = new DualSettingsService();
  const results: RegenerateHookResult[] = [];
  const scopesToProcess: SettingsScope[] = scope ? [scope] : ['global', 'project', 'local'];

  for (const currentScope of scopesToProcess) {
    const hooksWithMetadata = await settingsService.getHooksWithMetadata(currentScope);

    for (const [eventName, hookArray] of Object.entries(hooksWithMetadata)) {
      for (const hookWithMeta of hookArray) {
        const metadata = hookWithMeta.metadata;

        // Skip if no metadata or missing required fields
        if (!metadata || !metadata.identifier.name || !metadata.hookFactoryArguments) {
          continue;
        }

        // If specific hook requested, check if this matches
        if (hookName && metadata.identifier.name !== hookName) {
          continue;
        }

        const result = await regenerateSingleHook(
          metadata.identifier.name,
          metadata.hookFactoryArguments,
          currentScope,
          eventName as keyof ClaudeSettings['hooks']
        );

        results.push(result);
      }
    }
  }

  const successCount = results.filter(r => r.success).length;
  const skippedCount = results.filter(r => r.success && !r.updated).length;
  const errorCount = results.filter(r => !r.success).length;

  return {
    results,
    totalProcessed: results.length,
    successCount,
    skippedCount,
    errorCount,
  };
}
