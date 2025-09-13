/**
 * Merge two settings objects
 */

import type { ClaudeSettings } from '../../../types/index.js';

export function mergeSettings(existing: ClaudeSettings, imported: ClaudeSettings): ClaudeSettings {
  const merged: ClaudeSettings = { hooks: {} as ClaudeSettings['hooks'] };

  // Start with existing hooks
  if (existing.hooks) {
    for (const [event, configs] of Object.entries(existing.hooks)) {
      (merged.hooks as any)[event] = [...configs];
    }
  }

  // Add imported hooks
  if (imported.hooks) {
    for (const [event, configs] of Object.entries(imported.hooks)) {
      if (!(merged.hooks as any)[event]) {
        (merged.hooks as any)[event] = [];
      }
      (merged.hooks as any)[event].push(...configs);
    }
  }

  return merged;
}
