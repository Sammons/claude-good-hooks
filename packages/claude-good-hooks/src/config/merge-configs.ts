/**
 * Merge multiple configuration objects with priority order
 */

import type { ClaudeSettings, HookConfiguration } from '../types/index.js';

/**
 * Merge configurations with later configs taking priority
 */
export function mergeConfigs(...configs: ClaudeSettings[]): ClaudeSettings {
  const result: ClaudeSettings = {
    hooks: {}
  };

  for (const config of configs) {
    if (config.hooks) {
      for (const [eventName, eventHooks] of Object.entries(config.hooks)) {
        if (!result.hooks[eventName]) {
          result.hooks[eventName] = [];
        }

        // Merge hook configurations, avoiding duplicates
        const existing = result.hooks[eventName] || [];
        const newHooks = eventHooks || [];

        result.hooks[eventName] = mergeHookConfigurations(existing, newHooks);
      }
    }
  }

  return result;
}

function mergeHookConfigurations(existing: HookConfiguration[], newHooks: HookConfiguration[]): HookConfiguration[] {
  const merged = [...existing];

  for (const newHook of newHooks) {
    const existingIndex = merged.findIndex(h =>
      h.matcher === newHook.matcher &&
      JSON.stringify(h.hooks) === JSON.stringify(newHook.hooks)
    );

    if (existingIndex === -1) {
      merged.push(newHook);
    } else {
      // Replace existing with new configuration
      merged[existingIndex] = newHook;
    }
  }

  return merged;
}