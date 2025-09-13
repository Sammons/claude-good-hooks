/**
 * Selective replacement - only replaces claude-good-hooks managed hooks
 * This preserves any manually added or third-party hooks
 */

import type { ClaudeSettings } from '../../../types/index.js';

export function selectiveReplaceSettings(
  existing: ClaudeSettings,
  imported: ClaudeSettings
): ClaudeSettings {
  const result: ClaudeSettings = { hooks: {} as ClaudeSettings['hooks'] };

  // Start with existing hooks, filtering out claude-good-hooks managed ones
  if (existing.hooks) {
    for (const [event, configs] of Object.entries(existing.hooks)) {
      const preservedConfigs = configs.filter((config: any) => {
        // Keep hooks that are NOT managed by claude-good-hooks
        return !config.claudegoodhooks?.name && !(config as any).name;
      });

      if (preservedConfigs.length > 0) {
        (result.hooks as any)[event] = preservedConfigs;
      }
    }
  }

  // Add all imported hooks (which should be claude-good-hooks managed)
  if (imported.hooks) {
    for (const [event, configs] of Object.entries(imported.hooks)) {
      if (!(result.hooks as any)[event]) {
        (result.hooks as any)[event] = [];
      }
      (result.hooks as any)[event].push(...configs);
    }
  }

  return result;
}